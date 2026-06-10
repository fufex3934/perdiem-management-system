'use client';

import { CreditCard } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ListPagination } from '@/components/shared/list-pagination';
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
import { getApiErrorMessage } from '@/lib/api-client';
import type { Payment } from '@/lib/finance-api';
import * as financeApi from '@/lib/finance-api';
import { DEFAULT_PAGE_SIZE, INITIAL_PAGINATION, type PaginationMeta } from '@/lib/pagination';

type PendingPaymentAction =
  | { type: 'paid'; payment: Payment }
  | { type: 'failed'; payment: Payment };

export default function FinancePage() {
  const auth = useRequireAuth({ check: (a) => a.canViewFinance });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingPaymentAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);

  const loadPayments = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const result = await financeApi.listPayments(auth.accessToken, auth.tenantId, {
      page,
      limit: DEFAULT_PAGE_SIZE,
      status: statusFilter || undefined,
    });
    setPayments(result.items);
    setPagination({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (auth.ready) loadPayments().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadPayments]);

  async function confirmPaymentAction() {
    if (!pendingAction || !auth.accessToken || !auth.tenantId || !auth.canProcessFinance) {
      return;
    }

    const paymentId = pendingAction.payment.id;
    setActingOn(paymentId);
    setConfirmLoading(true);
    try {
      if (pendingAction.type === 'paid') {
        await financeApi.markPaymentPaid(auth.accessToken, auth.tenantId, paymentId, {
          paymentReference: references[paymentId],
        });
      } else {
        await financeApi.markPaymentFailed(auth.accessToken, auth.tenantId, paymentId, {
          notes: references[paymentId],
        });
      }
      setPendingAction(null);
      await loadPayments();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Payment update failed'));
    } finally {
      setActingOn(null);
      setConfirmLoading(false);
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
                              <Button
                                size="sm"
                                disabled={actingOn === payment.id}
                                onClick={() => setPendingAction({ type: 'paid', payment })}
                              >
                                Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actingOn === payment.id}
                                onClick={() => setPendingAction({ type: 'failed', payment })}
                              >
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
            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>

        <ConfirmDialog
          open={pendingAction !== null}
          onOpenChange={(open) => !open && !confirmLoading && setPendingAction(null)}
          title={pendingAction?.type === 'paid' ? 'Mark payment as paid?' : 'Mark payment as failed?'}
          description={
            pendingAction
              ? pendingAction.type === 'paid'
                ? `Confirm that ${pendingAction.payment.amount} ${pendingAction.payment.currency} for "${pendingAction.payment.travelTitle}" has been paid.`
                : `Mark the ${pendingAction.payment.amount} ${pendingAction.payment.currency} payment for "${pendingAction.payment.travelTitle}" as failed.`
              : ''
          }
          confirmLabel={pendingAction?.type === 'paid' ? 'Mark paid' : 'Mark failed'}
          variant={pendingAction?.type === 'failed' ? 'destructive' : 'default'}
          loading={confirmLoading}
          onConfirm={confirmPaymentAction}
        />
      </div>
    </AppShell>
  );
}
