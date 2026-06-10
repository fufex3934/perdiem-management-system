import { Permission } from '../enums/permission.enum';
import { UserRole } from '../enums/user-role.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TENANT_ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_INVITE,
    Permission.USERS_DELETE,
    Permission.USERS_MANAGE_ROLES,
  ],
  [UserRole.MANAGER]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_INVITE,
  ],
  [UserRole.EMPLOYEE]: [],
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
