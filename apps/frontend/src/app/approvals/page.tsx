'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as approvalsApi from '@/lib/approvals-api';
import type { TravelRequest } from '@/lib/travel-requests-api';

export default function ApprovalsPage() {
  const router = useRouter();
  const {
    user,
    accessToken,
    tenantId,
    isLoading,
    isAuthenticated,
    canManageApprovals,
    logout,
  } = useAuth();

  const [pending, setPending] = useState<TravelRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const loadPending = useCallback(async () => {
    if (!accessToken || !tenantId) return;
    const result = await approvalsApi.listPendingApprovals(accessToken, tenantId);
    setPending(result.items);
  }, [accessToken, tenantId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && !canManageApprovals) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && accessToken && tenantId && canManageApprovals) {
      loadPending().catch((err: Error) => setError(err.message));
    }
  }, [
    isLoading,
    isAuthenticated,
    canManageApprovals,
    accessToken,
    tenantId,
    router,
    loadPending,
  ]);

  async function handleApprove(requestId: string) {
    if (!accessToken || !tenantId) return;
    setError(null);
    setActingOn(requestId);
    try {
      await approvalsApi.approveTravelRequest(
        accessToken,
        tenantId,
        requestId,
        comments[requestId],
      );
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(requestId: string) {
    if (!accessToken || !tenantId) return;
    setError(null);
    setActingOn(requestId);
    try {
      await approvalsApi.rejectTravelRequest(
        accessToken,
        tenantId,
        requestId,
        comments[requestId],
      );
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActingOn(null);
    }
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
            <h1 className="text-lg font-semibold text-slate-900">Pending Approvals</h1>
            <p className="text-sm text-slate-500">
              Multi-step workflow — {user.role} actions
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              Dashboard
            </Link>
            <Link href="/travel-requests" className="text-sm text-blue-600 hover:underline">
              Travel requests
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

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Awaiting your approval ({pending.length})
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Employee requests: manager → tenant admin. Manager requests: tenant admin only.
          </p>

          <div className="mt-6 space-y-4">
            {pending.length === 0 && (
              <p className="text-sm text-slate-500">No requests pending your approval.</p>
            )}

            {pending.map((request) => {
              const currentStep = request.approvalSteps?.[request.currentStepIndex];
              const isActing = actingOn === request.id;

              return (
                <div key={request.id} className="rounded-xl border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{request.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.destinationCountryCode} · {request.days} days ·{' '}
                        {request.totalAmount} {request.currency}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Step {currentStep?.step ?? '—'}: requires {currentStep?.requiredRole}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      pending approval
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <input
                      placeholder="Comment (optional)"
                      value={comments[request.id] ?? ''}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                      className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={isActing}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {isActing ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={isActing}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-70"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
