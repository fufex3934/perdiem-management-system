import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let error = exception.name;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof exceptionResponse === 'object') {
      const responseBody = exceptionResponse as Record<string, unknown>;
      message = (responseBody.message as string) ?? message;
      error = (responseBody.error as string) ?? error;
      code = responseBody.code as string | undefined;
      details = responseBody.details as Record<string, unknown> | undefined;

      if (Array.isArray(responseBody.message)) {
        message = responseBody.message.join(', ');
      }
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

    this.logger.warn('HTTP exception', {
      requestId,
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      code,
    });

    response.status(status).json(errorResponse);
  }
}
