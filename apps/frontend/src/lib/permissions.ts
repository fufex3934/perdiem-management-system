export const Permission = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_INVITE: 'users:invite',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',
  POLICIES_READ: 'policies:read',
  POLICIES_WRITE: 'policies:write',
  POLICIES_DELETE: 'policies:delete',
  POLICIES_CALCULATE: 'policies:calculate',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const UserRole = {
  TENANT_ADMIN: 'tenant_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TENANT_ADMIN]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_INVITE,
    Permission.POLICIES_READ,
    Permission.POLICIES_WRITE,
    Permission.POLICIES_CALCULATE,
  ],
  [UserRole.EMPLOYEE]: [
    Permission.POLICIES_READ,
    Permission.POLICIES_CALCULATE,
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as UserRole] ?? [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function isTenantAdmin(role: string): boolean {
  return role === UserRole.TENANT_ADMIN;
}

export function canManageUsers(role: string): boolean {
  return hasPermission(role, Permission.USERS_READ);
}

export function canManagePolicies(role: string): boolean {
  return hasPermission(role, Permission.POLICIES_WRITE);
}

export function canCalculatePerDiem(role: string): boolean {
  return hasPermission(role, Permission.POLICIES_CALCULATE);
}
