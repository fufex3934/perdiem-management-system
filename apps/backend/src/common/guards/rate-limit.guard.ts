import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  SKIP_RATE_LIMIT_KEY,
} from '../decorators/rate-limit.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { AllConfig } from '@/infrastructure/config/configuration';
import { RateLimitService } from '../rate-limit/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService<AllConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const customLimit = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const rateLimitConfig = this.configService.get('rateLimit', { infer: true });
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const routeKey = `${request.method}:${request.route?.path ?? request.path}`;
    const key = `${ip}:${routeKey}`;

    const max = customLimit?.max ?? rateLimitConfig.max;
    const ttlMs = customLimit?.ttlMs ?? rateLimitConfig.ttlMs;

    if (!this.rateLimitService.consume(key, max, ttlMs)) {
      throw new BusinessException(
        {
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests. Please try again later.',
        },
        429,
      );
    }

    return true;
  }
}
