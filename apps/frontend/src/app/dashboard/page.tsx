'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  CreditCard,
  MapPin,
  Plane,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SpendBarChart } from '@/components/charts/spend-bar-chart';
import { StatusPieChart } from '@/components/charts/status-pie-chart';
import { TrendLineChart } from '@/components/charts/trend-line-chart';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { StatCard } from '@/components/shared/stat-card';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { AnalyticsDashboard } from '@/lib/analytics-api';
import * as analyticsApi from '@/lib/analytics-api';

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const auth = useRequireAuth();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId || !auth.canViewAnalytics) {
      setLoading(false);
      return;
    }
    try {
      const data = await analyticsApi.getDashboard(auth.accessToken, auth.tenantId);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken, auth.tenantId, auth.canViewAnalytics]);

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, load]);

  if (!auth.ready || !auth.user) return <PageLoading />;

  const statusChartData =
    dashboard?.travelRequests.byStatus.map((s) => ({
      name: s.status.replace(/_/g, ' '),
      value: s.count,
    })) ?? [];

  const countryChartData =
    dashboard?.travelRequests.topDestinations.map((c) => ({
      name: c.countryCode,
      amount: c.totalAmount,
    })) ?? [];

  const trendData =
    dashboard?.payments.byStatus.map((p, i) => ({
      month: p.status,
      amount: p.totalAmount,
    })) ?? [
      { month: 'Jan', amount: 0 },
      { month: 'Feb', amount: 0 },
      { month: 'Mar', amount: 0 },
    ];

  const quickLinks = [
    { href: '/travel-requests', label: 'New travel request', icon: MapPin, show: auth.canManageTravelRequests },
    { href: '/approvals', label: 'Review approvals', icon: ClipboardCheck, show: auth.canManageApprovals },
    { href: '/finance', label: 'View payments', icon: CreditCard, show: auth.canViewFinance },
    { href: '/analytics', label: 'Full analytics', icon: Wallet, show: auth.canViewAnalytics },
  ].filter((l) => l.show);

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader
          title={`Good day, ${auth.user.firstName}`}
          description="Overview of travel spend, approvals, and payments across your workspace."
        />

        {error && <ErrorAlert message={error} />}

        {loading ? (
          <PageLoading />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Travel requests"
                value={dashboard?.travelRequests.total ?? '—'}
                hint={auth.canReadAllAnalytics ? 'Tenant-wide' : 'Your requests'}
                icon={Plane}
              />
              <StatCard
                label="Per diem total"
                value={dashboard ? `$${formatAmount(dashboard.travelRequests.totalPerDiemAmount)}` : '—'}
                hint="Estimated spend"
                icon={Wallet}
              />
              <StatCard
                label="Paid"
                value={dashboard ? `$${formatAmount(dashboard.payments.totalPaid)}` : '—'}
                hint="Processed payments"
                icon={CreditCard}
              />
              <StatCard
                label="Pending approvals"
                value={dashboard?.pendingApprovals ?? '—'}
                hint="Awaiting action"
                icon={ClipboardCheck}
              />
            </div>

            {auth.canViewAnalytics && dashboard && (
              <div className="grid gap-6 lg:grid-cols-2">
                <StatusPieChart
                  title="Requests by status"
                  description="Distribution of travel request lifecycle"
                  data={statusChartData}
                />
                <SpendBarChart
                  title="Spend by destination"
                  description="Top countries by per diem amount"
                  data={countryChartData}
                />
                <div className="lg:col-span-2">
                  <TrendLineChart
                    title="Payment breakdown"
                    description="Amount by payment status"
                    data={trendData}
                  />
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Jump to the most common workflows</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {link.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            {!auth.canViewAnalytics && (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Create a travel request to get started with per diem management.
                  </p>
                  {auth.canManageTravelRequests && (
                    <Link href="/travel-requests" className={buttonVariants()}>
                      Go to travel requests
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
