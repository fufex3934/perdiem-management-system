import { apiClient } from './api-client';
import type { AuthUser } from './auth-types';

export interface PaginatedUsers {
  items: AuthUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Invite {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  invitedBy: string;
  userId: string;
  expiresAt: string;
  acceptedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface CreateInviteInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface CreateInviteResponse {
  invite: Invite;
  inviteToken: string;
  acceptUrl: string;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listUsers(
  token: string,
  tenantId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedUsers> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  const response = await apiClient.get<PaginatedUsers>(
    `/users${query ? `?${query}` : ''}`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function listInvites(token: string, tenantId: string): Promise<Invite[]> {
  const response = await apiClient.get<Invite[]>(
    '/users/invites',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function createInvite(
  token: string,
  tenantId: string,
  input: CreateInviteInput,
): Promise<CreateInviteResponse> {
  const response = await apiClient.post<CreateInviteResponse>(
    '/users/invites',
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function revokeInvite(
  token: string,
  tenantId: string,
  inviteId: string,
): Promise<void> {
  await apiClient.delete(`/users/invites/${inviteId}`, authOptions(token, tenantId));
}

export async function updateUser(
  token: string,
  tenantId: string,
  userId: string,
  input: Partial<Pick<AuthUser, 'firstName' | 'lastName' | 'role'>> & { status?: string },
): Promise<AuthUser> {
  const response = await apiClient.patch<AuthUser>(
    `/users/${userId}`,
    input,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function deleteUser(
  token: string,
  tenantId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/users/${userId}`, authOptions(token, tenantId));
}

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ message: string; email: string }> {
  const response = await apiClient.post<{ message: string; email: string }>(
    '/auth/accept-invite',
    { token, password },
  );
  return response.data;
}
