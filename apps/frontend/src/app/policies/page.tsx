'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/permissions';
import type { CalculationResult, Policy } from '@/lib/policies-api';
import * as policiesApi from '@/lib/policies-api';

export default function PoliciesPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canManagePolicies,
    canCalculatePerDiem,
    logout,
  } = useAuth();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPolicies = useCallback(async () => {
    if (!accessToken || !tenantId) return;
    const result = await policiesApi.listPolicies(accessToken, tenantId);
    setPolicies(result.items);
  }, [accessToken, tenantId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && accessToken && tenantId) {
      loadPolicies().catch((err: Error) => setError(err.message));
    }
  }, [isLoading, isAuthenticated, accessToken, tenantId, router, loadPolicies]);

  async function handleCreatePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !tenantId || !canManagePolicies) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const roleValue = String(formData.get('role'));

    try {
      await policiesApi.createPolicy(accessToken, tenantId, {
        name: String(formData.get('name')),
        countryCode: String(formData.get('countryCode')).toUpperCase(),
        role: roleValue === 'all' ? null : roleValue,
        dailyRate: Number(formData.get('dailyRate')),
        currency: String(formData.get('currency')).toUpperCase(),
        priority: Number(formData.get('priority') || 0),
        description: String(formData.get('description') || ''),
      });
      event.currentTarget.reset();
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !tenantId || !canCalculatePerDiem || !user) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await policiesApi.calculatePerDiem(accessToken, tenantId, {
        countryCode: String(formData.get('countryCode')).toUpperCase(),
        role: String(formData.get('role') || user.role),
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

  async function handleDeletePolicy(policyId: string) {
    if (!accessToken || !tenantId || !canManagePolicies) return;
    await policiesApi.deletePolicy(accessToken, tenantId, policyId);
    await loadPolicies();
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
            <h1 className="text-lg font-semibold text-slate-900">Per Diem Policies</h1>
            <p className="text-sm text-slate-500">Configure rates by country and role</p>
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
        {canManagePolicies && (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create policy</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreatePolicy}>
              <input name="name" placeholder="Policy name" required className="w-full rounded-lg border px-3 py-2 text-sm" />
              <input name="description" placeholder="Description (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input name="countryCode" placeholder="Country (US)" required maxLength={2} className="rounded-lg border px-3 py-2 text-sm uppercase" />
                <input name="currency" placeholder="Currency (USD)" required maxLength={3} className="rounded-lg border px-3 py-2 text-sm uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="dailyRate" type="number" step="0.01" min="0" placeholder="Daily rate" required className="rounded-lg border px-3 py-2 text-sm" />
                <input name="priority" type="number" min="0" placeholder="Priority" defaultValue={0} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
              <select name="role" className="w-full rounded-lg border px-3 py-2 text-sm" defaultValue={UserRole.EMPLOYEE}>
                <option value="all">All roles (default)</option>
                <option value={UserRole.EMPLOYEE}>Employee</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Create policy'}
              </button>
            </form>
          </section>
        )}

        {canCalculatePerDiem && (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Calculate per diem</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCalculate}>
              <input name="countryCode" placeholder="Country (US)" required maxLength={2} className="w-full rounded-lg border px-3 py-2 text-sm uppercase" />
              <select name="role" defaultValue={user.role} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value={UserRole.EMPLOYEE}>Employee</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
              </select>
              <input name="days" type="number" min="1" max="365" placeholder="Days" required className="w-full rounded-lg border px-3 py-2 text-sm" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
              >
                {isSubmitting ? 'Calculating...' : 'Calculate'}
              </button>
            </form>

            {calculation && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium text-emerald-900">{calculation.policyName}</p>
                <p className="mt-1 text-emerald-800">
                  {calculation.days} days × {calculation.dailyRate} {calculation.currency} ={' '}
                  <strong>{calculation.totalAmount} {calculation.currency}</strong>
                </p>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Active policies</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Priority</th>
                  {canManagePolicies && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={canManagePolicies ? 6 : 5} className="px-3 py-4 text-slate-500">
                      No policies configured yet
                    </td>
                  </tr>
                )}
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{policy.name}</td>
                    <td className="px-3 py-2">{policy.countryCode}</td>
                    <td className="px-3 py-2">{policy.role ?? 'all'}</td>
                    <td className="px-3 py-2">
                      {policy.dailyRate} {policy.currency}
                    </td>
                    <td className="px-3 py-2">{policy.priority}</td>
                    {canManagePolicies && (
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDeletePolicy(policy.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 lg:col-span-2">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
