import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import { Permission } from '../enums/permission.enum';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { roleHasAllPermissions } from '../rbac/role-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new BusinessException(
        { code: ErrorCodes.UNAUTHORIZED, message: 'Authentication required' },
        401,
      );
    }

    if (!roleHasAllPermissions(user.role, requiredPermissions)) {
      throw new BusinessException(
        {
          code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient permissions for this action',
          details: { required: requiredPermissions },
        },
        403,
      );
    }

    return true;
  }
}
