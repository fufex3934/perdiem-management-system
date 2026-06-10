import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AllConfig } from '@/infrastructure/config/configuration';
import { captureException } from '@/infrastructure/observability/sentry';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService<AllConfig, true>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';
    const isProduction =
      this.configService.get('app.nodeEnv', { infer: true }) === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred';
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseBody = exceptionResponse as Record<string, unknown>;
        message = (responseBody.message as string) ?? message;
        error = (responseBody.error as string) ?? exception.name;
        code = responseBody.code as string | undefined;
        details = responseBody.details as Record<string, unknown> | undefined;

        if (Array.isArray(responseBody.message)) {
          message = responseBody.message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      message = isProduction ? 'An unexpected error occurred' : exception.message;
      error = exception.name;
    }

    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      error,
      message,
      code,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    this.logger.error('Unhandled exception', {
      requestId,
      path: request.url,
      method: request.method,
      statusCode: status,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      captureException(exception, { requestId, path: request.url });
    }

    response.status(status).json(errorResponse);
  }
}
