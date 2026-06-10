'use client';

import { MapPin } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
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
import { getApiErrorMessage } from '@/lib/api-client';
import { DEFAULT_PAGE_SIZE, INITIAL_PAGINATION, type PaginationMeta } from '@/lib/pagination';
import type { TravelRequest } from '@/lib/travel-requests-api';
import * as travelRequestsApi from '@/lib/travel-requests-api';

type PendingAction =
  | { type: 'submit'; request: TravelRequest }
  | { type: 'cancel'; request: TravelRequest };

export default function TravelRequestsPage() {
  const auth = useRequireAuth();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [auditRequest, setAuditRequest] = useState<TravelRequest | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);

  const loadRequests = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const result = await travelRequestsApi.listTravelRequests(auth.accessToken, auth.tenantId, {
      page,
      limit: DEFAULT_PAGE_SIZE,
    });
    setRequests(result.items);
    setPagination({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, page]);

  useEffect(() => {
    if (auth.ready) {
      loadRequests().catch((err: Error) => setError(err.message));
    }
  }, [auth.ready, loadRequests]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !auth.tenantId || !auth.canManageTravelRequests) return;
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      await travelRequestsApi.createTravelRequest(auth.accessToken, auth.tenantId, {
        title: String(formData.get('title')),
        purpose: String(formData.get('purpose') || ''),
        destinationCountryCode: String(formData.get('destinationCountryCode')).toUpperCase(),
        destinationCity: String(formData.get('destinationCity') || ''),
        startDate: String(formData.get('startDate')),
        endDate: String(formData.get('endDate')),
      });
      event.currentTarget.reset();
      if (page === 1) {
        await loadRequests();
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create travel request'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction || !auth.accessToken || !auth.tenantId) return;

    setError(null);
    setConfirmLoading(true);
    try {
      if (pendingAction.type === 'submit') {
        await travelRequestsApi.submitTravelRequest(
          auth.accessToken,
          auth.tenantId,
          pendingAction.request.id,
        );
      } else {
        await travelRequestsApi.cancelTravelRequest(
          auth.accessToken,
          auth.tenantId,
          pendingAction.request.id,
        );
      }
      setPendingAction(null);
      await loadRequests();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Action failed'));
    } finally {
      setConfirmLoading(false);
    }
  }

  if (!auth.ready || !auth.user) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Travel requests"
          description={
            auth.canReadAllTravelRequests
              ? 'All tenant travel requests with auto per diem calculation'
              : 'Your travel requests with auto per diem calculation'
          }
        />

        {error && <ErrorAlert message={error} />}

        {auth.canManageTravelRequests && (
          <Card>
            <CardHeader>
              <CardTitle>New travel request</CardTitle>
              <CardDescription>Per diem is calculated from matching policies</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Trip title</Label>
                  <Input id="title" name="title" placeholder="Client visit" required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input id="purpose" name="purpose" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationCountryCode">Country</Label>
                  <Input id="destinationCountryCode" name="destinationCountryCode" placeholder="US" maxLength={2} className="uppercase" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationCity">City</Label>
                  <Input id="destinationCity" name="destinationCity" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create draft'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All requests</CardTitle>
            <CardDescription>{pagination.total} total</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoading />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No travel requests"
                description="Create a draft to start the approval workflow."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Per diem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const isOwner = request.userId === auth.user!.id;
                    const canAct = isOwner || auth.canReadAllTravelRequests;
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.title}</TableCell>
                        <TableCell>
                          {request.destinationCity ? `${request.destinationCity}, ` : ''}
                          {request.destinationCountryCode}
                        </TableCell>
                        <TableCell>
                          {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                          <span className="ml-1 text-muted-foreground">({request.days}d)</span>
                        </TableCell>
                        <TableCell>
                          {request.totalAmount} {request.currency}
                          <span className="block text-xs text-muted-foreground">{request.policyName}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canAct && request.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingAction({ type: 'submit', request })}
                              >
                                Submit
                              </Button>
                            )}
                            {canAct && ['draft', 'pending_approval'].includes(request.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setPendingAction({ type: 'cancel', request })}
                              >
                                Cancel
                              </Button>
                            )}
                            {(isOwner || auth.canReadAllTravelRequests) && request.status !== 'draft' && (
                              <Button variant="ghost" size="sm" onClick={() => setAuditRequest(request)}>
                                Audit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
          title={pendingAction?.type === 'submit' ? 'Submit travel request?' : 'Cancel travel request?'}
          description={
            pendingAction?.type === 'submit'
              ? `"${pendingAction.request.title}" will enter the approval workflow and can no longer be edited as a draft.`
              : pendingAction
                ? `"${pendingAction.request.title}" will be cancelled. This action cannot be undone.`
                : ''
          }
          confirmLabel={pendingAction?.type === 'submit' ? 'Submit' : 'Cancel request'}
          variant={pendingAction?.type === 'cancel' ? 'destructive' : 'default'}
          loading={confirmLoading}
          onConfirm={confirmPendingAction}
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
