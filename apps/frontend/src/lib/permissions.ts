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

export function canManageTravelRequests(role: string): boolean {
  return hasPermission(role, Permission.TRAVEL_REQUESTS_WRITE);
}

export function canReadAllTravelRequests(role: string): boolean {
  return hasPermission(role, Permission.TRAVEL_REQUESTS_READ_ALL);
}

export function canManageApprovals(role: string): boolean {
  return hasPermission(role, Permission.APPROVALS_APPROVE);
}

export function canViewFinance(role: string): boolean {
  return hasPermission(role, Permission.FINANCE_READ);
}

export function canReadAllFinance(role: string): boolean {
  return hasPermission(role, Permission.FINANCE_READ_ALL);
}

export function canProcessFinance(role: string): boolean {
  return hasPermission(role, Permission.FINANCE_PROCESS);
}

export function canExportFinance(role: string): boolean {
  return hasPermission(role, Permission.FINANCE_EXPORT);
}

export function canViewAnalytics(role: string): boolean {
  return hasPermission(role, Permission.ANALYTICS_READ_OWN);
}

export function canReadAllAnalytics(role: string): boolean {
  return hasPermission(role, Permission.ANALYTICS_READ);
}

export function canExportAnalytics(role: string): boolean {
  return hasPermission(role, Permission.ANALYTICS_EXPORT);
}
