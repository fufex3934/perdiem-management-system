import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';
    const startTime = Date.now();

    this.logger.info('Incoming request', {
      requestId,
      method: request.method,
      path: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.info('Request completed', {
            requestId,
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            durationMs: duration,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error('Request failed', {
            requestId,
            method: request.method,
            path: request.url,
            durationMs: duration,
            error: error.message,
          });
        },
      }),
    );
  }
}
