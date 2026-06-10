'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Payment } from '@/lib/finance-api';
import * as financeApi from '@/lib/finance-api';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

export default function FinancePage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canViewFinance,
    canProcessFinance,
    canExportFinance,
    canReadAllFinance,
    logout,
  } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});

  const loadPayments = useCallback(async () => {
    if (!accessToken || !tenantId) return;
    const result = await financeApi.listPayments(accessToken, tenantId, {
      status: statusFilter || undefined,
    });
    setPayments(result.items);
  }, [accessToken, tenantId, statusFilter]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && !canViewFinance) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && accessToken && tenantId && canViewFinance) {
      loadPayments().catch((err: Error) => setError(err.message));
    }
  }, [
    isLoading,
    isAuthenticated,
    canViewFinance,
    accessToken,
    tenantId,
    router,
    loadPayments,
  ]);

  async function handleMarkPaid(paymentId: string) {
    if (!accessToken || !tenantId || !canProcessFinance) return;
    setError(null);
    setActingOn(paymentId);
    try {
      await financeApi.markPaymentPaid(accessToken, tenantId, paymentId, {
        paymentReference: references[paymentId],
      });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark payment as paid');
    } finally {
      setActingOn(null);
    }
  }

  async function handleMarkFailed(paymentId: string) {
    if (!accessToken || !tenantId || !canProcessFinance) return;
    setError(null);
    setActingOn(paymentId);
    try {
      await financeApi.markPaymentFailed(accessToken, tenantId, paymentId, {
        notes: references[paymentId],
      });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark payment as failed');
    } finally {
      setActingOn(null);
    }
  }

  async function handleExport() {
    if (!accessToken || !tenantId || !canExportFinance) return;
    setError(null);
    try {
      const exportData = await financeApi.exportPayments(accessToken, tenantId);
      financeApi.downloadCsv(exportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

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
            <h1 className="text-lg font-semibold text-slate-900">Finance</h1>
            <p className="text-sm text-slate-500">
              {canReadAllFinance
                ? 'All tenant per diem payments'
                : 'Your per diem payments'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              Dashboard
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
              {canExportFinance && (
                <button
                  onClick={() => handleExport()}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reference</th>
                  {canProcessFinance && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={canProcessFinance ? 6 : 5}
                      className="px-3 py-4 text-slate-500"
                    >
                      No payments yet. Payments are created when travel requests are fully
                      approved.
                    </td>
                  </tr>
                )}
                {payments.map((payment) => {
                  const isActing = actingOn === payment.id;

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{payment.travelTitle}</td>
                      <td className="px-3 py-2">
                        {payment.destinationCountryCode}
                        <span className="ml-1 text-slate-500">({payment.days}d)</span>
                      </td>
                      <td className="px-3 py-2">
                        {payment.amount} {payment.currency}
                        <span className="block text-xs text-slate-500">
                          {payment.policyName}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[payment.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {payment.paymentReference || '—'}
                        {payment.paidAt && (
                          <span className="block text-xs text-slate-500">
                            Paid {new Date(payment.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      {canProcessFinance && (
                        <td className="px-3 py-2">
                          {payment.status === 'pending' ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                placeholder="Ref / notes"
                                value={references[payment.id] ?? ''}
                                onChange={(e) =>
                                  setReferences((prev) => ({
                                    ...prev,
                                    [payment.id]: e.target.value,
                                  }))
                                }
                                className="w-28 rounded border px-2 py-1 text-xs"
                              />
                              <button
                                onClick={() => handleMarkPaid(payment.id)}
                                disabled={isActing}
                                className="text-emerald-600 hover:underline disabled:opacity-50"
                              >
                                Mark paid
                              </button>
                              <button
                                onClick={() => handleMarkFailed(payment.id)}
                                disabled={isActing}
                                className="text-red-600 hover:underline disabled:opacity-50"
                              >
                                Failed
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
