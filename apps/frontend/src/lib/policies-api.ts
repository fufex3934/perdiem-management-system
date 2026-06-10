import { apiClient } from './api-client';

export interface Policy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  countryCode: string;
  role: string | null;
  dailyRate: number;
  currency: string;
  status: string;
  priority: number;
  version?: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPolicies {
  items: Policy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
  countryCode: string;
  role?: string | null;
  dailyRate: number;
  currency: string;
  status?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  countryCode?: string;
  role?: string | null;
  dailyRate?: number;
  currency?: string;
  status?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CalculatePerDiemInput {
  countryCode: string;
  role: string;
  days: number;
  startDate?: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  snapshot: {
    name: string;
    description: string;
    countryCode: string;
    role: string | null;
    dailyRate: number;
    currency: string;
    status: string;
    priority: number;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  };
  changedBy: string;
  changedByEmail: string;
  createdAt: string;
}

export interface CalculationResult {
  countryCode: string;
  role: string;
  days: number;
  dailyRate: number;
  currency: string;
  totalAmount: number;
  policyId: string;
  policyName: string;
  appliedRole: string | null;
  priority: number;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listPolicies(
  token: string,
  tenantId: string,
): Promise<PaginatedPolicies> {
  const response = await apiClient.get<PaginatedPolicies>(
    '/policies',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function createPolicy(
  token: string,
  tenantId: string,
  input: CreatePolicyInput,
): Promise<Policy> {
  const response = await apiClient.post<Policy>(
    '/policies',
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function updatePolicy(
  token: string,
  tenantId: string,
  policyId: string,
  input: UpdatePolicyInput,
): Promise<Policy> {
  const response = await apiClient.patch<Policy>(
    `/policies/${policyId}`,
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function listPolicyVersions(
  token: string,
  tenantId: string,
  policyId: string,
): Promise<PolicyVersion[]> {
  const response = await apiClient.get<PolicyVersion[]>(
    `/policies/${policyId}/versions`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function deletePolicy(
  token: string,
  tenantId: string,
  policyId: string,
): Promise<void> {
  await apiClient.delete(`/policies/${policyId}`, authOptions(token, tenantId));
}

export async function calculatePerDiem(
  token: string,
  tenantId: string,
  input: CalculatePerDiemInput,
): Promise<CalculationResult> {
  const response = await apiClient.post<CalculationResult>(
    '/policies/calculate',
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}
