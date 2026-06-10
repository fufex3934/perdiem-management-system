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
  canManagePolicies,
  canManageUsers,
  hasPermission,
  isTenantAdmin,
  Permission,
} from './permissions';
import type { AuthSession, AuthUser, LoginInput, RegisterTenantInput } from './auth-types';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  tenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTenantAdmin: boolean;
  canManageUsers: boolean;
  canManagePolicies: boolean;
  canCalculatePerDiem: boolean;
  hasPermission: (permission: Permission) => boolean;
  login: (input: LoginInput) => Promise<void>;
  registerTenant: (input: RegisterTenantInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(getStoredSession());
    setIsLoading(false);
  }, []);

  const persistSession = useCallback((next: AuthSession) => {
    storeSession(next);
    setSession(next);
  }, []);

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

  const role = session?.user.role ?? '';

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.tokens.accessToken ?? null,
      tenantId: session?.user.tenantId ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.tokens.accessToken),
      isTenantAdmin: isTenantAdmin(role),
      canManageUsers: canManageUsers(role),
      canManagePolicies: canManagePolicies(role),
      canCalculatePerDiem: canCalculatePerDiem(role),
      hasPermission: (permission: Permission) => hasPermission(role, permission),
      login,
      registerTenant,
      logout,
    }),
    [session, isLoading, role, login, registerTenant, logout],
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
