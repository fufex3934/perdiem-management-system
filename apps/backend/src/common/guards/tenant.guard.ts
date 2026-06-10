import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.tenantId) {
      throw new BusinessException(
        { code: ErrorCodes.UNAUTHORIZED, message: 'Authentication required' },
        401,
      );
    }

    const headerTenantId = request.headers['x-tenant-id'] as string | undefined;

    if (headerTenantId && headerTenantId !== user.tenantId) {
      throw new BusinessException(
        {
          code: ErrorCodes.TENANT_MISMATCH,
          message: 'Tenant context does not match authenticated user',
        },
        403,
      );
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
