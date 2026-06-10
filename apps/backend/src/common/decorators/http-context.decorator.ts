import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { HttpContext } from '../interfaces/http-context.interface';

export const HttpContextParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): HttpContext => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return {
      ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
      userAgent: request.headers['user-agent'] ?? 'unknown',
      requestId: (request.headers['x-request-id'] as string) ?? 'unknown',
    };
  },
);
