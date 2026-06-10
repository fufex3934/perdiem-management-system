export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status?: string;
  invitedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterTenantInput {
  tenantName: string;
  slug?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
