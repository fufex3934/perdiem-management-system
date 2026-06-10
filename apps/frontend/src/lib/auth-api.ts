import { apiClient } from './api-client';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginInput,
  RegisterTenantInput,
} from './auth-types';

export async function registerTenant(
  input: RegisterTenantInput,
): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/auth/register-tenant', input);
  return response.data;
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/auth/login', input);
  return response.data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function logout(accessToken: string, tenantId: string): Promise<void> {
  await apiClient.post('/auth/logout', undefined, {
    token: accessToken,
    tenantId,
  });
}

export async function getProfile(
  accessToken: string,
  tenantId: string,
): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>('/auth/me', {
    token: accessToken,
    tenantId,
  });
  return response.data;
}

export interface OAuthConfig {
  google: boolean;
  microsoft: boolean;
  saml: boolean;
}

export async function getOAuthConfig(): Promise<OAuthConfig> {
  const response = await apiClient.get<OAuthConfig>('/auth/oauth/config');
  return response.data;
}

export async function exchangeOAuthCode(code: string): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/auth/oauth/exchange', { code });
  return response.data;
}
