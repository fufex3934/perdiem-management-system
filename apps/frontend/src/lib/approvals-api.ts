import { apiClient } from './api-client';
import type { TravelRequest } from './travel-requests-api';

export interface PaginatedPendingApprovals {
  items: TravelRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApprovalAuditEntry {
  id: string;
  travelRequestId: string;
  actorId: string;
  actorRole: string;
  action: string;
  step: number | null;
  comment: string;
  previousStatus: string;
  newStatus: string;
  createdAt: string;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listPendingApprovals(
  token: string,
  tenantId: string,
): Promise<PaginatedPendingApprovals> {
  const response = await apiClient.get<PaginatedPendingApprovals>(
    '/approvals/pending',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function approveTravelRequest(
  token: string,
  tenantId: string,
  requestId: string,
  comment?: string,
): Promise<TravelRequest> {
  const response = await apiClient.post<TravelRequest>(
    `/approvals/travel-requests/${requestId}/approve`,
    { comment: comment ?? '' },
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function rejectTravelRequest(
  token: string,
  tenantId: string,
  requestId: string,
  comment?: string,
): Promise<TravelRequest> {
  const response = await apiClient.post<TravelRequest>(
    `/approvals/travel-requests/${requestId}/reject`,
    { comment: comment ?? '' },
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function getAuditTrail(
  token: string,
  tenantId: string,
  requestId: string,
): Promise<ApprovalAuditEntry[]> {
  const response = await apiClient.get<ApprovalAuditEntry[]>(
    `/approvals/travel-requests/${requestId}/audit-trail`,
    authOptions(token, tenantId),
  );
  return response.data;
}
