'use client';

import { CreditCard } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Payment } from '@/lib/finance-api';
import * as financeApi from '@/lib/finance-api';

export default function FinancePage() {
  const auth = useRequireAuth({ check: (a) => a.canViewFinance });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const result = await financeApi.listPayments(auth.accessToken, auth.tenantId, {
      status: statusFilter || undefined,
    });
    setPayments(result.items);
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, statusFilter]);

  useEffect(() => {
    if (auth.ready) loadPayments().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadPayments]);

  async function handleMarkPaid(paymentId: string) {
    if (!auth.accessToken || !auth.tenantId || !auth.canProcessFinance) return;
    setActingOn(paymentId);
    try {
      await financeApi.markPaymentPaid(auth.accessToken, auth.tenantId, paymentId, {
        paymentReference: references[paymentId],
      });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark paid');
    } finally {
      setActingOn(null);
    }
  }

  async function handleMarkFailed(paymentId: string) {
    if (!auth.accessToken || !auth.tenantId || !auth.canProcessFinance) return;
    setActingOn(paymentId);
    try {
      await financeApi.markPaymentFailed(auth.accessToken, auth.tenantId, paymentId, {
        notes: references[paymentId],
      });
      await loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark failed');
    } finally {
      setActingOn(null);
    }
  }

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Finance"
          description={auth.canReadAllFinance ? 'All tenant per diem payments' : 'Your per diem payments'}
          actions={
            auth.canExportFinance ? (
              <Button
                variant="secondary"
                onClick={() =>
                  financeApi.exportPayments(auth.accessToken!, auth.tenantId!).then(financeApi.downloadCsv)
                }
              >
                Export CSV
              </Button>
            ) : undefined
          }
        />

        {error && <ErrorAlert message={error} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Payments</CardTitle>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoading />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Payments are created when travel requests are fully approved."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    {auth.canProcessFinance && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.travelTitle}</TableCell>
                      <TableCell>
                        {payment.destinationCountryCode}
                        <span className="ml-1 text-muted-foreground">({payment.days}d)</span>
                      </TableCell>
                      <TableCell>
                        {payment.amount} {payment.currency}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.paymentReference || '—'}
                      </TableCell>
                      {auth.canProcessFinance && (
                        <TableCell className="text-right">
                          {payment.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <Input
                                placeholder="Ref"
                                className="h-8 w-24"
                                value={references[payment.id] ?? ''}
                                onChange={(e) =>
                                  setReferences((p) => ({ ...p, [payment.id]: e.target.value }))
                                }
                              />
                              <Button size="sm" disabled={actingOn === payment.id} onClick={() => handleMarkPaid(payment.id)}>
                                Paid
                              </Button>
                              <Button size="sm" variant="destructive" disabled={actingOn === payment.id} onClick={() => handleMarkFailed(payment.id)}>
                                Fail
                              </Button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
