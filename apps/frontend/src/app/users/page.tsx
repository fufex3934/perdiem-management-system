'use client';

import { UserPlus, Users } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
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
import type { AuthUser } from '@/lib/auth-types';
import { UserRole } from '@/lib/permissions';
import type { CreateInviteResponse, Invite } from '@/lib/users-api';
import * as usersApi from '@/lib/users-api';

export default function UsersPage() {
  const auth = useRequireAuth({ check: (a) => a.canManageUsers });
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [lastInvite, setLastInvite] = useState<CreateInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const [usersResult, invitesResult] = await Promise.all([
      usersApi.listUsers(auth.accessToken, auth.tenantId),
      usersApi.listInvites(auth.accessToken, auth.tenantId),
    ]);
    setUsers(usersResult.items);
    setInvites(invitesResult);
    setLoading(false);
  }, [auth.accessToken, auth.tenantId]);

  useEffect(() => {
    if (auth.ready) loadData().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadData]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !auth.tenantId) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await usersApi.createInvite(auth.accessToken, auth.tenantId, {
        email: String(formData.get('email')),
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        role: String(formData.get('role')),
      });

      setLastInvite(result);
      event.currentTarget.reset();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!auth.accessToken || !auth.tenantId) return;
    await usersApi.revokeInvite(auth.accessToken, auth.tenantId, inviteId);
    await loadData();
  }

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Manage team members and pending invitations"
        />

        {error && <ErrorAlert message={error} />}

        {lastInvite && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
            <p className="font-medium">Invite created for {lastInvite.invite.email}</p>
            {lastInvite.emailSent ? (
              <p className="mt-1 text-emerald-800">An invitation email was sent.</p>
            ) : null}
            <p className="mt-1 break-all text-emerald-800">Accept URL: {lastInvite.acceptUrl}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Invite user
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleInvite}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" name="firstName" required placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" name="lastName" required placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select id="role" name="role" defaultValue={UserRole.EMPLOYEE}>
                    <option value={UserRole.EMPLOYEE}>Employee</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending invite…' : 'Send invite'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="No pending invites"
                  description="Invite teammates to join your organization."
                />
              ) : (
                <ul className="space-y-3">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 p-3"
                    >
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.firstName} {invite.lastName} · {invite.role}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeInvite(invite.id)}
                      >
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Team members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoading />
            ) : users.length === 0 ? (
              <EmptyState icon={Users} title="No users" description="Your team will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.firstName} {item.lastName}
                      </TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.status ?? 'active'}
                      </TableCell>
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
