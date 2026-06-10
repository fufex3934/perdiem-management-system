import { Permission } from '../enums/permission.enum';
import { UserRole } from '../enums/user-role.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TENANT_ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_INVITE,
    Permission.USERS_DELETE,
    Permission.USERS_MANAGE_ROLES,
    Permission.POLICIES_READ,
    Permission.POLICIES_WRITE,
    Permission.POLICIES_DELETE,
    Permission.POLICIES_CALCULATE,
    Permission.TRAVEL_REQUESTS_READ,
    Permission.TRAVEL_REQUESTS_READ_ALL,
    Permission.TRAVEL_REQUESTS_WRITE,
    Permission.TRAVEL_REQUESTS_SUBMIT,
    Permission.TRAVEL_REQUESTS_CANCEL,
  ],
  [UserRole.MANAGER]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_INVITE,
    Permission.POLICIES_READ,
    Permission.POLICIES_WRITE,
    Permission.POLICIES_CALCULATE,
    Permission.TRAVEL_REQUESTS_READ,
    Permission.TRAVEL_REQUESTS_READ_ALL,
    Permission.TRAVEL_REQUESTS_WRITE,
    Permission.TRAVEL_REQUESTS_SUBMIT,
    Permission.TRAVEL_REQUESTS_CANCEL,
  ],
  [UserRole.EMPLOYEE]: [
    Permission.POLICIES_READ,
    Permission.POLICIES_CALCULATE,
    Permission.TRAVEL_REQUESTS_READ,
    Permission.TRAVEL_REQUESTS_WRITE,
    Permission.TRAVEL_REQUESTS_SUBMIT,
    Permission.TRAVEL_REQUESTS_CANCEL,
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function roleHasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every((permission) => rolePermissions.includes(permission));
}
