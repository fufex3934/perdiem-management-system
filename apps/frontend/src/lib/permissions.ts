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
  TRAVEL_REQUESTS_READ: 'travel_requests:read',
  TRAVEL_REQUESTS_READ_ALL: 'travel_requests:read_all',
  TRAVEL_REQUESTS_WRITE: 'travel_requests:write',
  TRAVEL_REQUESTS_SUBMIT: 'travel_requests:submit',
  TRAVEL_REQUESTS_CANCEL: 'travel_requests:cancel',
  APPROVALS_READ: 'approvals:read',
  APPROVALS_APPROVE: 'approvals:approve',
  APPROVALS_REJECT: 'approvals:reject',
  FINANCE_READ: 'finance:read',
  FINANCE_READ_ALL: 'finance:read_all',
  FINANCE_PROCESS: 'finance:process',
  FINANCE_EXPORT: 'finance:export',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_READ_OWN: 'analytics:read_own',
  ANALYTICS_EXPORT: 'analytics:export',
  SECURITY_AUDIT_READ: 'security:audit_read',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const UserRole = {
  TENANT_ADMIN: 'tenant_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Fallback when loading a legacy session without server permissions. */
const ROLE_PERMISSIONS_FALLBACK: Record<UserRole, Permission[]> = {
  [UserRole.TENANT_ADMIN]: Object.values(Permission),
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
    Permission.APPROVALS_READ,
    Permission.APPROVALS_APPROVE,
    Permission.APPROVALS_REJECT,
    Permission.FINANCE_READ,
    Permission.FINANCE_READ_ALL,
    Permission.FINANCE_EXPORT,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_READ_OWN,
    Permission.ANALYTICS_EXPORT,
  ],
  [UserRole.EMPLOYEE]: [
    Permission.POLICIES_READ,
    Permission.POLICIES_CALCULATE,
    Permission.TRAVEL_REQUESTS_READ,
    Permission.TRAVEL_REQUESTS_WRITE,
    Permission.TRAVEL_REQUESTS_SUBMIT,
    Permission.TRAVEL_REQUESTS_CANCEL,
    Permission.FINANCE_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
    Permission.ANALYTICS_READ_OWN,
  ],
};

export function resolvePermissions(user: {
  role: string;
  permissions?: string[];
}): Permission[] {
  if (user.permissions?.length) {
    return user.permissions as Permission[];
  }
  return ROLE_PERMISSIONS_FALLBACK[user.role as UserRole] ?? [];
}

export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

export function isTenantAdmin(role: string): boolean {
  return role === UserRole.TENANT_ADMIN;
}

export function canManageUsers(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.USERS_READ);
}

export function canManagePolicies(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.POLICIES_WRITE);
}

export function canDeletePolicies(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.POLICIES_DELETE);
}

export function canCalculatePerDiem(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.POLICIES_CALCULATE);
}

export function canManageTravelRequests(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.TRAVEL_REQUESTS_WRITE);
}

export function canReadAllTravelRequests(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.TRAVEL_REQUESTS_READ_ALL);
}

export function canManageApprovals(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.APPROVALS_APPROVE);
}

export function canViewFinance(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.FINANCE_READ);
}

export function canReadAllFinance(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.FINANCE_READ_ALL);
}

export function canProcessFinance(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.FINANCE_PROCESS);
}

export function canExportFinance(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.FINANCE_EXPORT);
}

export function canViewAnalytics(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.ANALYTICS_READ_OWN);
}

export function canReadAllAnalytics(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.ANALYTICS_READ);
}

export function canExportAnalytics(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.ANALYTICS_EXPORT);
}

export function canViewSecurityAudit(permissions: Permission[]): boolean {
  return hasPermission(permissions, Permission.SECURITY_AUDIT_READ);
}
