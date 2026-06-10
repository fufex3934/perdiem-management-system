import { Permission } from '../enums/permission.enum';
import { UserRole } from '../enums/user-role.enum';
import {
  getPermissionsForRole,
  roleHasAllPermissions,
  roleHasPermission,
} from './role-permissions';

describe('Role Permissions', () => {
  it('should grant all permissions to tenant admin', () => {
    expect(getPermissionsForRole(UserRole.TENANT_ADMIN)).toContain(
      Permission.USERS_MANAGE_ROLES,
    );
  });

  it('should grant limited permissions to manager', () => {
    const permissions = getPermissionsForRole(UserRole.MANAGER);
    expect(permissions).toContain(Permission.USERS_INVITE);
    expect(permissions).not.toContain(Permission.USERS_DELETE);
  });

  it('should grant no user permissions to employee', () => {
    expect(getPermissionsForRole(UserRole.EMPLOYEE)).toEqual([]);
  });

  it('should evaluate permission checks correctly', () => {
    expect(roleHasPermission(UserRole.MANAGER, Permission.USERS_READ)).toBe(true);
    expect(roleHasPermission(UserRole.EMPLOYEE, Permission.USERS_READ)).toBe(false);
    expect(
      roleHasAllPermissions(UserRole.TENANT_ADMIN, [
        Permission.USERS_READ,
        Permission.USERS_DELETE,
      ]),
    ).toBe(true);
  });
});
