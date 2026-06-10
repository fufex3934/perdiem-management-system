'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { AuthUser } from '@/lib/auth-types';
import { UserRole } from '@/lib/permissions';
import type { CreateInviteResponse, Invite } from '@/lib/users-api';
import * as usersApi from '@/lib/users-api';

export default function UsersPage() {
  const router = useRouter();
  const { user, accessToken, tenantId, isLoading, isAuthenticated, canManageUsers, logout } =
    useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [lastInvite, setLastInvite] = useState<CreateInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken || !tenantId) return;

    const [usersResult, invitesResult] = await Promise.all([
      usersApi.listUsers(accessToken, tenantId),
      usersApi.listInvites(accessToken, tenantId),
    ]);

    setUsers(usersResult.items);
    setInvites(invitesResult);
  }, [accessToken, tenantId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && !canManageUsers) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && canManageUsers) {
      loadData().catch((err: Error) => setError(err.message));
    }
  }, [isLoading, isAuthenticated, canManageUsers, router, loadData]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !tenantId) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await usersApi.createInvite(accessToken, tenantId, {
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
    if (!accessToken || !tenantId) return;
    await usersApi.revokeInvite(accessToken, tenantId, inviteId);
    await loadData();
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
            <h1 className="text-lg font-semibold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">Manage users and invites for your tenant</p>
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

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Invite user</h2>
          <form className="mt-4 space-y-3" onSubmit={handleInvite}>
            <input
              name="firstName"
              placeholder="First name"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              name="lastName"
              placeholder="Last name"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <select name="role" className="w-full rounded-lg border px-3 py-2 text-sm" defaultValue={UserRole.EMPLOYEE}>
              <option value={UserRole.EMPLOYEE}>Employee</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isSubmitting ? 'Sending invite...' : 'Send invite'}
            </button>
          </form>

          {lastInvite && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-medium">Invite created for {lastInvite.invite.email}</p>
              <p className="mt-1 break-all">Accept URL: {lastInvite.acceptUrl}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pending invites</h2>
          <ul className="mt-4 space-y-3">
            {invites.length === 0 && (
              <li className="text-sm text-slate-500">No pending invites</li>
            )}
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{invite.email}</p>
                  <p className="text-slate-500">
                    {invite.firstName} {invite.lastName} · {invite.role}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeInvite(invite.id)}
                  className="text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {item.firstName} {item.lastName}
                    </td>
                    <td className="px-3 py-2">{item.email}</td>
                    <td className="px-3 py-2">{item.role}</td>
                    <td className="px-3 py-2">{item.status ?? 'active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
