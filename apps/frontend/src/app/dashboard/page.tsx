'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, tenantId, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Tenant: {tenantId}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Phase 1 — Auth + Tenant
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Welcome, {user.firstName} {user.lastName}
          </h2>
          <p className="mt-2 text-slate-600">{user.email}</p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Role</dt>
              <dd className="mt-1 font-medium text-slate-900">{user.role}</dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Tenant ID</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">{user.tenantId}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
