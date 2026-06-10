'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { AnalyticsDashboard, SpendReport } from '@/lib/analytics-api';
import * as analyticsApi from '@/lib/analytics-api';

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnalyticsPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canViewAnalytics,
    canReadAllAnalytics,
    canExportAnalytics,
    logout,
  } = useAuth();

  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [report, setReport] = useState<SpendReport | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken || !tenantId) return;

    const [dashboardData, reportData] = await Promise.all([
      analyticsApi.getDashboard(accessToken, tenantId),
      analyticsApi.getSpendReport(accessToken, tenantId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    ]);

    setDashboard(dashboardData);
    setReport(reportData);
  }, [accessToken, tenantId, fromDate, toDate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && !canViewAnalytics) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && accessToken && tenantId && canViewAnalytics) {
      loadData().catch((err: Error) => setError(err.message));
    }
  }, [
    isLoading,
    isAuthenticated,
    canViewAnalytics,
    accessToken,
    tenantId,
    router,
    loadData,
  ]);

  async function handleExport() {
    if (!accessToken || !tenantId || !canExportAnalytics) return;
    setError(null);
    setExporting(true);
    try {
      const exportData = await analyticsApi.exportSpendReport(accessToken, tenantId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      analyticsApi.downloadCsv(exportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  }

  if (isLoading || !user || !dashboard || !report) {
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
            <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">
              {canReadAllAnalytics ? 'Tenant-wide insights' : 'Your travel & payment summary'}
            </p>
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

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Travel requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard.travelRequests.total}</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total per diem</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatAmount(dashboard.travelRequests.totalPerDiemAmount)}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Payments paid</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {formatAmount(dashboard.payments.totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              {canReadAllAnalytics ? 'Pending approvals' : 'Pending payments'}
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {canReadAllAnalytics
                ? dashboard.pendingApprovals
                : formatAmount(dashboard.payments.totalPending)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Spend report</h2>
              <p className="text-sm text-slate-500">
                Breakdown by status and destination
                {report.scope === 'own' ? ' (your requests only)' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-slate-600">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-600">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              {canExportAnalytics && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              )}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Requests in range</dt>
              <dd className="mt-1 text-xl font-semibold">{report.totalTravelRequests}</dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Per diem total</dt>
              <dd className="mt-1 text-xl font-semibold">{formatAmount(report.totalPerDiemAmount)}</dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Paid</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-700">
                {formatAmount(report.totalPaid)}
              </dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-sm text-slate-500">Pending</dt>
              <dd className="mt-1 text-xl font-semibold text-amber-700">
                {formatAmount(report.totalPending)}
              </dd>
            </div>
          </dl>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                By status
              </h3>
              <div className="mt-3 overflow-hidden rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Count</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.byStatus.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No data
                        </td>
                      </tr>
                    ) : (
                      report.byStatus.map((row) => (
                        <tr key={row.status}>
                          <td className="px-4 py-3 capitalize text-slate-900">
                            {row.status.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{row.count}</td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatAmount(row.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                By country
              </h3>
              <div className="mt-3 overflow-hidden rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Country</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Count</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.byCountry.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No data
                        </td>
                      </tr>
                    ) : (
                      report.byCountry.map((row) => (
                        <tr key={row.countryCode}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.countryCode}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{row.count}</td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatAmount(row.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
