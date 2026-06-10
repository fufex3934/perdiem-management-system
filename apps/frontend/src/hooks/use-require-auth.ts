'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { AuthContextValue } from '@/lib/auth-context';

interface UseRequireAuthOptions {
  /** When false, redirects to redirectTo. Evaluated after auth loads. */
  permission?: boolean;
  /** Custom permission check using full auth context */
  check?: (auth: AuthContextValue) => boolean;
  redirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const router = useRouter();
  const auth = useAuth();
  const { permission, check, redirectTo = '/dashboard' } = options;

  const allowed = useMemo(() => {
    if (check) return check(auth);
    return permission ?? true;
  }, [auth, check, permission]);

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!auth.isLoading && auth.isAuthenticated && !allowed) {
      router.replace(redirectTo);
    }
  }, [auth.isLoading, auth.isAuthenticated, allowed, redirectTo, router]);

  const ready = !auth.isLoading && auth.isAuthenticated && auth.user && allowed;

  return { ...auth, ready };
}
