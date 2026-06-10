'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpendBarChart } from '@/components/charts/spend-bar-chart';
import { StatusPieChart } from '@/components/charts/status-pie-chart';
import { TrendLineChart } from '@/components/charts/trend-line-chart';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { AnalyticsDashboard, SpendReport } from '@/lib/analytics-api';
import * as analyticsApi from '@/lib/analytics-api';

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnalyticsPage() {
  const auth = useRequireAuth({ check: (a) => a.canViewAnalytics });
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [report, setReport] = useState<SpendReport | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const [dashboardData, reportData] = await Promise.all([
      analyticsApi.getDashboard(auth.accessToken, auth.tenantId),
      analyticsApi.getSpendReport(auth.accessToken, auth.tenantId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    ]);
    setDashboard(dashboardData);
    setReport(reportData);
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, fromDate, toDate]);

  useEffect(() => {
    if (auth.ready) loadData().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadData]);

  async function handleExport() {
    if (!auth.accessToken || !auth.tenantId || !auth.canExportAnalytics) return;
    setExporting(true);
    try {
      const data = await analyticsApi.exportSpendReport(auth.accessToken, auth.tenantId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      analyticsApi.downloadCsv(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          title="Analytics"
          description={
            auth.canReadAllAnalytics
              ? 'Tenant-wide spend insights and reports'
              : 'Your travel and payment summary'
          }
          actions={
            auth.canExportAnalytics ? (
              <Button variant="secondary" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            ) : undefined
          }
        />

        {error && <ErrorAlert message={error} />}

        {loading || !dashboard || !report ? (
          <PageLoading />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Travel requests" value={dashboard.travelRequests.total} />
              <StatCard label="Per diem total" value={formatAmount(dashboard.travelRequests.totalPerDiemAmount)} />
              <StatCard label="Paid" value={formatAmount(dashboard.payments.totalPaid)} />
              <StatCard label="Pending" value={formatAmount(dashboard.payments.totalPending)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <StatusPieChart
                title="By status"
                data={report.byStatus.map((s) => ({
                  name: s.status.replace(/_/g, ' '),
                  value: s.count,
                }))}
              />
              <SpendBarChart
                title="By country"
                data={report.byCountry.map((c) => ({ name: c.countryCode, amount: c.totalAmount }))}
              />
              <div className="lg:col-span-2">
                <TrendLineChart
                  title="Spend trend"
                  description="Per diem amount by request status"
                  data={report.byStatus.map((s) => ({
                    month: s.status.replace(/_/g, ' '),
                    amount: s.totalAmount,
                  }))}
                />
              </div>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
                <CardTitle>Spend report</CardTitle>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="from">From</Label>
                    <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="to">To</Label>
                    <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                  <Button className="self-end" variant="secondary" onClick={() => loadData()}>
                    Apply
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byCountry.map((row) => (
                      <TableRow key={row.countryCode}>
                        <TableCell className="font-medium">{row.countryCode}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatAmount(row.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
