import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum';
import { UserRole } from '../enums/user-role.enum';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: PermissionsGuard;

  beforeEach(() => {
    guard = new PermissionsGuard(reflector);
    jest.resetAllMocks();
  });

  function createContext(role: UserRole): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'user-id',
            tenantId: 'tenant-id',
            email: 'user@test.com',
            role,
          },
        }),
      }),
    } as ExecutionContext;
  }

  it('should allow when no permissions are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    expect(guard.canActivate(createContext(UserRole.EMPLOYEE))).toBe(true);
  });

  it('should allow tenant admin with required permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) {
        return [Permission.USERS_DELETE];
      }
      return false;
    });

    expect(guard.canActivate(createContext(UserRole.TENANT_ADMIN))).toBe(true);
  });

  it('should reject employee without permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) {
        return [Permission.USERS_READ];
      }
      return false;
    });

    expect(() => guard.canActivate(createContext(UserRole.EMPLOYEE))).toThrow(
      BusinessException,
    );
  });
});
