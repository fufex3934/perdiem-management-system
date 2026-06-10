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

  it('should grant policy read/calculate to employee', () => {
    const permissions = getPermissionsForRole(UserRole.EMPLOYEE);
    expect(permissions).toContain(Permission.POLICIES_READ);
    expect(permissions).toContain(Permission.POLICIES_CALCULATE);
    expect(permissions).not.toContain(Permission.POLICIES_WRITE);
  });

  it('should grant travel request permissions to employee without read_all', () => {
    const permissions = getPermissionsForRole(UserRole.EMPLOYEE);
    expect(permissions).toContain(Permission.TRAVEL_REQUESTS_READ);
    expect(permissions).toContain(Permission.TRAVEL_REQUESTS_WRITE);
    expect(permissions).not.toContain(Permission.TRAVEL_REQUESTS_READ_ALL);
  });

  it('should grant read_all travel requests to manager', () => {
    const permissions = getPermissionsForRole(UserRole.MANAGER);
    expect(permissions).toContain(Permission.TRAVEL_REQUESTS_READ_ALL);
  });

  it('should grant approval permissions to manager but not employee', () => {
    const managerPermissions = getPermissionsForRole(UserRole.MANAGER);
    const employeePermissions = getPermissionsForRole(UserRole.EMPLOYEE);
    expect(managerPermissions).toContain(Permission.APPROVALS_APPROVE);
    expect(employeePermissions).not.toContain(Permission.APPROVALS_APPROVE);
  });

  it('should grant notifications read/write to all roles', () => {
    expect(roleHasPermission(UserRole.EMPLOYEE, Permission.NOTIFICATIONS_READ)).toBe(true);
    expect(roleHasPermission(UserRole.EMPLOYEE, Permission.NOTIFICATIONS_WRITE)).toBe(true);
    expect(roleHasPermission(UserRole.MANAGER, Permission.NOTIFICATIONS_READ)).toBe(true);
  });

  it('should grant finance process to tenant admin only', () => {
    expect(roleHasPermission(UserRole.TENANT_ADMIN, Permission.FINANCE_PROCESS)).toBe(true);
    expect(roleHasPermission(UserRole.MANAGER, Permission.FINANCE_PROCESS)).toBe(false);
    expect(roleHasPermission(UserRole.EMPLOYEE, Permission.FINANCE_READ)).toBe(true);
    expect(roleHasPermission(UserRole.EMPLOYEE, Permission.FINANCE_EXPORT)).toBe(false);
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
