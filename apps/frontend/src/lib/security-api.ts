import { apiClient } from './api-client';

export interface SecurityAuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  success: boolean;
  ip: string;
  userAgent: string;
  requestId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedSecurityAuditLogs {
  items: SecurityAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listAuditLogs(
  token: string,
  tenantId: string,
  params?: {
    page?: number;
    limit?: number;
    action?: string;
    success?: boolean;
    fromDate?: string;
    toDate?: string;
  },
): Promise<PaginatedSecurityAuditLogs> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.action) search.set('action', params.action);
  if (params?.success !== undefined) search.set('success', String(params.success));
  if (params?.fromDate) search.set('fromDate', params.fromDate);
  if (params?.toDate) search.set('toDate', params.toDate);

  const query = search.toString() ? `?${search.toString()}` : '';

  const response = await apiClient.get<PaginatedSecurityAuditLogs>(
    `/security/audit-logs${query}`,
    authOptions(token, tenantId),
  );
  return response.data;
}
