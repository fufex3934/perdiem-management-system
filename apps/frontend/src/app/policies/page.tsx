'use client';

import { Calculator, FileText } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ListPagination } from '@/components/shared/list-pagination';
import { PolicyEditDialog } from '@/components/shared/policy-edit-dialog';
import { PolicyVersionDialog } from '@/components/shared/policy-version-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { UserRole } from '@/lib/permissions';
import type { CalculationResult, Policy } from '@/lib/policies-api';
import { getApiErrorMessage } from '@/lib/api-client';
import { DEFAULT_PAGE_SIZE, INITIAL_PAGINATION, type PaginationMeta } from '@/lib/pagination';
import * as policiesApi from '@/lib/policies-api';

export default function PoliciesPage() {
  const auth = useRequireAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyPolicy, setHistoryPolicy] = useState<Policy | null>(null);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(INITIAL_PAGINATION);
  const createInFlight = useRef(false);

  const loadPolicies = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const result = await policiesApi.listPolicies(auth.accessToken, auth.tenantId, {
      page,
      limit: DEFAULT_PAGE_SIZE,
    });
    setPolicies(result.items);
    setPagination({
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, page]);

  useEffect(() => {
    if (auth.ready) loadPolicies().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadPolicies]);

  async function handleCreatePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !auth.accessToken ||
      !auth.tenantId ||
      !auth.canManagePolicies ||
      createInFlight.current
    ) {
      return;
    }

    setError(null);
    createInFlight.current = true;
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const roleValue = String(formData.get('role'));

    try {
      await policiesApi.createPolicy(auth.accessToken, auth.tenantId, {
        name: String(formData.get('name')),
        countryCode: String(formData.get('countryCode')).toUpperCase(),
        role: roleValue === 'all' ? null : roleValue,
        dailyRate: Number(formData.get('dailyRate')),
        currency: String(formData.get('currency')).toUpperCase(),
        priority: Number(formData.get('priority') || 0),
        description: String(formData.get('description') || ''),
      });
      form.reset();
      if (page === 1) {
        await loadPolicies();
      } else {
        setPage(1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create policy'));
    } finally {
      createInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !auth.tenantId || !auth.canCalculatePerDiem || !auth.user) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await policiesApi.calculatePerDiem(auth.accessToken, auth.tenantId, {
        countryCode: String(formData.get('countryCode')).toUpperCase(),
        role: String(formData.get('role') || auth.user.role),
        days: Number(formData.get('days')),
      });
      setCalculation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
      setCalculation(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDeletePolicy() {
    if (!policyToDelete || !auth.accessToken || !auth.tenantId || !auth.canDeletePolicies) {
      return;
    }

    setError(null);
    setConfirmLoading(true);
    try {
      await policiesApi.deletePolicy(auth.accessToken, auth.tenantId, policyToDelete.id);
      setPolicyToDelete(null);
      if (policies.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadPolicies();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete policy'));
    } finally {
      setConfirmLoading(false);
    }
  }

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Policies"
          description="Configure per diem rates by country and role"
        />

        {error && <ErrorAlert message={error} />}

        <div className="grid gap-6 lg:grid-cols-2">
          {auth.canManagePolicies && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Create policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreatePolicy}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Policy name</Label>
                    <Input id="name" name="name" required placeholder="US Manager Rate" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" placeholder="Optional" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country</Label>
                      <Input id="countryCode" name="countryCode" required maxLength={2} placeholder="US" className="uppercase" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input id="currency" name="currency" required maxLength={3} placeholder="USD" className="uppercase" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dailyRate">Daily rate</Label>
                      <Input id="dailyRate" name="dailyRate" type="number" step="0.01" min="0" required placeholder="150" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input id="priority" name="priority" type="number" min="0" defaultValue={0} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select id="role" name="role" defaultValue="all">
                      <option value="all">All roles (default)</option>
                      <option value={UserRole.EMPLOYEE}>Employee</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                      <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : 'Create policy'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {auth.canCalculatePerDiem && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Calculate per diem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCalculate}>
                  <div className="space-y-2">
                    <Label htmlFor="calcCountry">Country</Label>
                    <Input id="calcCountry" name="countryCode" required maxLength={2} placeholder="US" className="uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calcRole">Role</Label>
                    <Select id="calcRole" name="role" defaultValue={auth.user!.role}>
                      <option value={UserRole.EMPLOYEE}>Employee</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                      <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days">Days</Label>
                    <Input id="days" name="days" type="number" min="1" max="365" required placeholder="5" />
                  </div>
                  <Button type="submit" className="w-full" variant="secondary" disabled={isSubmitting}>
                    {isSubmitting ? 'Calculating…' : 'Calculate'}
                  </Button>
                </form>

                {calculation && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm">
                    <p className="font-medium text-emerald-900">{calculation.policyName}</p>
                    <p className="mt-1 text-emerald-800">
                      {calculation.days} days × {calculation.dailyRate} {calculation.currency} ={' '}
                      <strong>
                        {calculation.totalAmount} {calculation.currency}
                      </strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active policies</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoading />
            ) : policies.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No policies yet"
                description="Create a policy to define per diem rates for your team."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{policy.countryCode}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{policy.role ?? 'all'}</TableCell>
                      <TableCell>
                        {policy.dailyRate} {policy.currency}
                      </TableCell>
                      <TableCell>{policy.priority}</TableCell>
                      <TableCell>{policy.version ?? 1}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {auth.canManagePolicies && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditPolicy(policy)}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryPolicy(policy)}
                          >
                            History
                          </Button>
                          {auth.canDeletePolicies && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPolicyToDelete(policy)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
          open={policyToDelete !== null}
          onOpenChange={(open) => !open && !confirmLoading && setPolicyToDelete(null)}
          title="Delete policy?"
          description={
            policyToDelete
              ? `"${policyToDelete.name}" will be removed. Travel requests that already used this rate are not affected.`
              : ''
          }
          confirmLabel="Delete"
          loading={confirmLoading}
          onConfirm={confirmDeletePolicy}
        />
        <PolicyEditDialog
          open={editPolicy !== null}
          onOpenChange={(open) => !open && setEditPolicy(null)}
          policy={editPolicy}
          accessToken={auth.accessToken!}
          tenantId={auth.tenantId!}
          onSaved={() => loadPolicies().catch((err: Error) => setError(err.message))}
        />
        <PolicyVersionDialog
          open={historyPolicy !== null}
          onOpenChange={(open) => !open && setHistoryPolicy(null)}
          policy={historyPolicy}
          accessToken={auth.accessToken!}
          tenantId={auth.tenantId!}
        />
      </div>
    </AppShell>
  );
}
