'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { TravelRequest } from '@/lib/travel-requests-api';
import * as travelRequestsApi from '@/lib/travel-requests-api';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TravelRequestsPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canManageTravelRequests,
    canReadAllTravelRequests,
    logout,
  } = useAuth();

  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!accessToken || !tenantId) return;
    const result = await travelRequestsApi.listTravelRequests(accessToken, tenantId);
    setRequests(result.items);
  }, [accessToken, tenantId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && accessToken && tenantId) {
      loadRequests().catch((err: Error) => setError(err.message));
    }
  }, [isLoading, isAuthenticated, accessToken, tenantId, router, loadRequests]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !tenantId || !canManageTravelRequests) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await travelRequestsApi.createTravelRequest(accessToken, tenantId, {
        title: String(formData.get('title')),
        purpose: String(formData.get('purpose') || ''),
        destinationCountryCode: String(formData.get('destinationCountryCode')).toUpperCase(),
        destinationCity: String(formData.get('destinationCity') || ''),
        startDate: String(formData.get('startDate')),
        endDate: String(formData.get('endDate')),
      });
      event.currentTarget.reset();
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create travel request');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(requestId: string) {
    if (!accessToken || !tenantId) return;
    await travelRequestsApi.submitTravelRequest(accessToken, tenantId, requestId);
    await loadRequests();
  }

  async function handleCancel(requestId: string) {
    if (!accessToken || !tenantId) return;
    await travelRequestsApi.cancelTravelRequest(accessToken, tenantId, requestId);
    await loadRequests();
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
            <h1 className="text-lg font-semibold text-slate-900">Travel Requests</h1>
            <p className="text-sm text-slate-500">
              {canReadAllTravelRequests
                ? 'All tenant travel requests'
                : 'Your travel requests with auto per diem calculation'}
            </p>
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

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
        {canManageTravelRequests && (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">New travel request</h2>
            <p className="mt-1 text-sm text-slate-500">
              Per diem is calculated automatically from matching policies.
            </p>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
              <input
                name="title"
                placeholder="Trip title"
                required
                className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="purpose"
                placeholder="Purpose (optional)"
                className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                name="destinationCountryCode"
                placeholder="Country (US)"
                required
                maxLength={2}
                className="rounded-lg border px-3 py-2 text-sm uppercase"
              />
              <input
                name="destinationCity"
                placeholder="City (optional)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="startDate"
                type="date"
                required
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                name="endDate"
                type="date"
                required
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 sm:col-span-2"
              >
                {isSubmitting ? 'Creating...' : 'Create draft'}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Per diem</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-slate-500">
                      No travel requests yet
                    </td>
                  </tr>
                )}
                {requests.map((request) => {
                  const isOwner = request.userId === user.id;
                  const canAct = isOwner || canReadAllTravelRequests;

                  return (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{request.title}</td>
                      <td className="px-3 py-2">
                        {request.destinationCity
                          ? `${request.destinationCity}, `
                          : ''}
                        {request.destinationCountryCode}
                      </td>
                      <td className="px-3 py-2">
                        {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)}
                        <span className="ml-1 text-slate-500">({request.days}d)</span>
                      </td>
                      <td className="px-3 py-2">
                        {request.totalAmount} {request.currency}
                        <span className="block text-xs text-slate-500">{request.policyName}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[request.status] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {canAct && request.status === 'draft' && (
                            <button
                              onClick={() => handleSubmit(request.id)}
                              className="text-blue-600 hover:underline"
                            >
                              Submit
                            </button>
                          )}
                          {canAct &&
                            (request.status === 'draft' || request.status === 'submitted') && (
                              <button
                                onClick={() => handleCancel(request.id)}
                                className="text-red-600 hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
