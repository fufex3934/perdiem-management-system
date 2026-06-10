'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { SecurityAuditLog } from '@/lib/security-api';
import * as securityApi from '@/lib/security-api';

const ACTION_LABELS: Record<string, string> = {
  'auth.login_success': 'Login success',
  'auth.login_failed': 'Login failed',
  'auth.logout': 'Logout',
  'auth.register_tenant': 'Tenant registered',
  'auth.refresh_token': 'Token refresh',
  'auth.accept_invite': 'Invite accepted',
  'user.updated': 'User updated',
  'user.deleted': 'User deleted',
  'user.invite_created': 'Invite created',
  'user.invite_revoked': 'Invite revoked',
  'finance.payment_paid': 'Payment marked paid',
  'finance.payment_failed': 'Payment marked failed',
};

export default function SecurityAuditLogsPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canViewSecurityAudit,
    logout,
  } = useAuth();

  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!accessToken || !tenantId) return;

    const result = await securityApi.listAuditLogs(accessToken, tenantId, {
      action: actionFilter || undefined,
      success:
        successFilter === ''
          ? undefined
          : successFilter === 'true',
    });

    setLogs(result.items);
    setTotal(result.total);
  }, [accessToken, tenantId, actionFilter, successFilter]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && !canViewSecurityAudit) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && accessToken && tenantId && canViewSecurityAudit) {
      loadLogs().catch((err: Error) => setError(err.message));
    }
  }, [
    isLoading,
    isAuthenticated,
    canViewSecurityAudit,
    accessToken,
    tenantId,
    router,
    loadLogs,
  ]);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Security audit logs</h1>
            <p className="text-sm text-slate-500">Authentication and sensitive action history</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All outcomes</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Outcome</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.actorEmail ?? log.userId ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          log.success
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-slate-500">{total} total events</p>
      </div>
    </main>
  );
}
