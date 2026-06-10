'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from './auth-api';
import {
  clearSession,
  getStoredSession,
  storeSession,
} from './auth-storage';
import {
  canCalculatePerDiem,
  canDeletePolicies,
  canExportAnalytics,
  canExportFinance,
  canManageApprovals,
  canManagePolicies,
  canManageTravelRequests,
  canManageUsers,
  canProcessFinance,
  canReadAllAnalytics,
  canReadAllFinance,
  canReadAllTravelRequests,
  canViewAnalytics,
  canViewFinance,
  canViewSecurityAudit,
  hasPermission,
  isTenantAdmin,
  Permission,
  resolvePermissions,
} from './permissions';
import type { AuthSession, AuthUser, LoginInput, RegisterTenantInput } from './auth-types';

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: Permission[];
  accessToken: string | null;
  tenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTenantAdmin: boolean;
  canManageUsers: boolean;
  canManagePolicies: boolean;
  canDeletePolicies: boolean;
  canCalculatePerDiem: boolean;
  canManageTravelRequests: boolean;
  canReadAllTravelRequests: boolean;
  canManageApprovals: boolean;
  canViewFinance: boolean;
  canReadAllFinance: boolean;
  canProcessFinance: boolean;
  canExportFinance: boolean;
  canViewAnalytics: boolean;
  canReadAllAnalytics: boolean;
  canExportAnalytics: boolean;
  canViewSecurityAudit: boolean;
  hasPermission: (permission: Permission) => boolean;
  login: (input: LoginInput) => Promise<void>;
  registerTenant: (input: RegisterTenantInput) => Promise<void>;
  completeOAuthSignIn: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((next: AuthSession) => {
    storeSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored?.tokens.accessToken || !stored.user.tenantId) {
      setSession(stored);
      setIsLoading(false);
      return;
    }

    setSession(stored);
    authApi
      .getProfile(stored.tokens.accessToken, stored.user.tenantId)
      .then((user) => persistSession({ ...stored, user }))
      .catch(() => setSession(stored))
      .finally(() => setIsLoading(false));
  }, [persistSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const next = await authApi.login(input);
      persistSession(next);
      router.push('/dashboard');
    },
    [persistSession, router],
  );

  const registerTenant = useCallback(
    async (input: RegisterTenantInput) => {
      const next = await authApi.registerTenant(input);
      persistSession(next);
      router.push('/dashboard');
    },
    [persistSession, router],
  );

  const completeOAuthSignIn = useCallback(
    async (code: string) => {
      const next = await authApi.exchangeOAuthCode(code);
      persistSession(next);
      router.push('/dashboard');
    },
    [persistSession, router],
  );

  const logout = useCallback(async () => {
    if (session) {
      try {
        await authApi.logout(session.tokens.accessToken, session.user.tenantId);
      } catch {
        // Clear local session even if API logout fails
      }
    }
    clearSession();
    setSession(null);
    router.push('/login');
  }, [router, session]);

  const user = session?.user ?? null;
  const role = user?.role ?? '';
  const permissions = useMemo(
    () => (user ? resolvePermissions(user) : []),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      accessToken: session?.tokens.accessToken ?? null,
      tenantId: user?.tenantId ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.tokens.accessToken),
      isTenantAdmin: isTenantAdmin(role),
      canManageUsers: canManageUsers(permissions),
      canManagePolicies: canManagePolicies(permissions),
      canDeletePolicies: canDeletePolicies(permissions),
      canCalculatePerDiem: canCalculatePerDiem(permissions),
      canManageTravelRequests: canManageTravelRequests(permissions),
      canReadAllTravelRequests: canReadAllTravelRequests(permissions),
      canManageApprovals: canManageApprovals(permissions),
      canViewFinance: canViewFinance(permissions),
      canReadAllFinance: canReadAllFinance(permissions),
      canProcessFinance: canProcessFinance(permissions),
      canExportFinance: canExportFinance(permissions),
      canViewAnalytics: canViewAnalytics(permissions),
      canReadAllAnalytics: canReadAllAnalytics(permissions),
      canExportAnalytics: canExportAnalytics(permissions),
      canViewSecurityAudit: canViewSecurityAudit(permissions),
      hasPermission: (permission: Permission) => hasPermission(permissions, permission),
      login,
      registerTenant,
      completeOAuthSignIn,
      logout,
    }),
    [session, user, permissions, role, isLoading, login, registerTenant, completeOAuthSignIn, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
