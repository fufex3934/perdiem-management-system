'use client';

import { ClipboardCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ApprovalAuditDialog } from '@/components/shared/approval-audit-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ListPagination } from '@/components/shared/list-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { DEFAULT_PAGE_SIZE, INITIAL_PAGINATION, type PaginationMeta } from '@/lib/pagination';
import * as approvalsApi from '@/lib/approvals-api';
import type { TravelRequest } from '@/lib/travel-requests-api';

export default function ApprovalsPage() {
  const auth = useRequireAuth({ check: (a) => a.canManageApprovals });
  const [pending, setPending] = useState<TravelRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [auditRequest, setAuditRequest] = useState<TravelRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<TravelRequest | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);

  const loadPending = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const result = await approvalsApi.listPendingApprovals(auth.accessToken, auth.tenantId, {
      page,
      limit: DEFAULT_PAGE_SIZE,
    });
    setPending(result.items);
    setPagination({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, page]);

  useEffect(() => {
    if (auth.ready) loadPending().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadPending]);

  async function handleApprove(requestId: string) {
    if (!auth.accessToken || !auth.tenantId) return;
    setActingOn(requestId);
    try {
      await approvalsApi.approveTravelRequest(auth.accessToken, auth.tenantId, requestId, comments[requestId]);
      await loadPending();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Approval failed'));
    } finally {
      setActingOn(null);
    }
  }

  async function confirmReject() {
    if (!requestToReject || !auth.accessToken || !auth.tenantId) return;

    setConfirmLoading(true);
    try {
      await approvalsApi.rejectTravelRequest(
        auth.accessToken,
        auth.tenantId,
        requestToReject.id,
        comments[requestToReject.id],
      );
      setRequestToReject(null);
      await loadPending();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Rejection failed'));
    } finally {
      setConfirmLoading(false);
    }
  }

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Pending approvals"
          description="Review and action travel requests in your approval queue"
        />

        {error && <ErrorAlert message={error} />}

        {loading ? (
          <PageLoading />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="All caught up"
            description="No travel requests are waiting for your approval right now."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((request) => {
              const currentStep = request.approvalSteps?.[request.currentStepIndex];
              const isActing = actingOn === request.id;
              return (
                <Card key={request.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div>
                      <CardTitle className="text-base">{request.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {request.destinationCountryCode} · {request.days} days · {request.totalAmount} {request.currency}
                      </CardDescription>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Step {currentStep?.step ?? '—'} requires {currentStep?.requiredRole?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <StatusBadge status="pending_approval" />
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-end gap-3">
                    <Input
                      placeholder="Comment (optional)"
                      value={comments[request.id] ?? ''}
                      onChange={(e) => setComments((p) => ({ ...p, [request.id]: e.target.value }))}
                      className="max-w-md flex-1"
                    />
                    <Button variant="secondary" onClick={() => setAuditRequest(request)}>
                      Audit trail
                    </Button>
                    <Button onClick={() => handleApprove(request.id)} disabled={isActing}>
                      {isActing ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setRequestToReject(request)}
                      disabled={isActing}
                    >
                      Reject
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        )}

        <ConfirmDialog
          open={requestToReject !== null}
          onOpenChange={(open) => !open && !confirmLoading && setRequestToReject(null)}
          title="Reject travel request?"
          description={
            requestToReject
              ? `"${requestToReject.title}" will be rejected and returned to the requester.`
              : ''
          }
          confirmLabel="Reject"
          loading={confirmLoading}
          onConfirm={confirmReject}
        />

        <ApprovalAuditDialog
          open={auditRequest !== null}
          onOpenChange={(open) => !open && setAuditRequest(null)}
          requestId={auditRequest?.id ?? null}
          requestTitle={auditRequest?.title}
          accessToken={auth.accessToken!}
          tenantId={auth.tenantId!}
        />
      </div>
    </AppShell>
  );
}
