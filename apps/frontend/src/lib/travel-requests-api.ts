import { apiClient } from './api-client';

export interface TravelRequest {
  id: string;
  tenantId: string;
  userId: string;
  requesterRole: string;
  title: string;
  purpose: string;
  destinationCountryCode: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  days: number;
  policyId: string;
  policyName: string;
  dailyRate: number;
  currency: string;
  totalAmount: number;
  appliedPolicyRole: string | null;
  status: string;
  submittedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTravelRequests {
  items: TravelRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTravelRequestInput {
  title: string;
  purpose?: string;
  destinationCountryCode: string;
  destinationCity?: string;
  startDate: string;
  endDate: string;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listTravelRequests(
  token: string,
  tenantId: string,
): Promise<PaginatedTravelRequests> {
  const response = await apiClient.get<PaginatedTravelRequests>(
    '/travel-requests',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function createTravelRequest(
  token: string,
  tenantId: string,
  input: CreateTravelRequestInput,
): Promise<TravelRequest> {
  const response = await apiClient.post<TravelRequest>(
    '/travel-requests',
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function submitTravelRequest(
  token: string,
  tenantId: string,
  requestId: string,
): Promise<TravelRequest> {
  const response = await apiClient.post<TravelRequest>(
    `/travel-requests/${requestId}/submit`,
    {},
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function cancelTravelRequest(
  token: string,
  tenantId: string,
  requestId: string,
): Promise<TravelRequest> {
  const response = await apiClient.post<TravelRequest>(
    `/travel-requests/${requestId}/cancel`,
    {},
    authOptions(token, tenantId),
  );
  return response.data;
}
