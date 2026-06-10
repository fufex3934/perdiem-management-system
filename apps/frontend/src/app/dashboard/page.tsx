'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    tenantId,
    isLoading,
    isAuthenticated,
    canManageUsers,
    canManagePolicies,
    canCalculatePerDiem,
    canManageTravelRequests,
    canManageApprovals,
    canViewFinance,
    canProcessFinance,
    canViewAnalytics,
    canViewSecurityAudit,
    logout,
  } = useAuth();

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
            Phase 9 — Security Hardening
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Welcome, {user.firstName} {user.lastName}
          </h2>
          <p className="mt-2 text-slate-600">{user.email}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {canManageUsers && (
              <Link
                href="/users"
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Manage users
              </Link>
            )}
            {(canManagePolicies || canCalculatePerDiem) && (
              <Link
                href="/policies"
                className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Per diem policies
              </Link>
            )}
            {canManageTravelRequests && (
              <Link
                href="/travel-requests"
                className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Travel requests
              </Link>
            )}
            {canManageApprovals && (
              <Link
                href="/approvals"
                className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                Pending approvals
              </Link>
            )}
            {canViewFinance && (
              <Link
                href="/finance"
                className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              >
                {canProcessFinance ? 'Finance & payments' : 'My payments'}
              </Link>
            )}
            <Link
              href="/notifications"
              className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Notifications
            </Link>
            {canViewAnalytics && (
              <Link
                href="/analytics"
                className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
              >
                Analytics & reports
              </Link>
            )}
            {canViewSecurityAudit && (
              <Link
                href="/security/audit-logs"
                className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
              >
                Security audit logs
              </Link>
            )}
          </div>

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
