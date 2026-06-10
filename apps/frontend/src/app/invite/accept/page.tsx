'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import * as usersApi from '@/lib/users-api';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password'));
    const inviteToken = String(formData.get('token') || token);

    if (!inviteToken) {
      setError('Invite token is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await usersApi.acceptInvite(inviteToken, password);
      setSuccess(result.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to accept invite');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Accept invite</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set your password to activate your account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!token && (
            <div>
              <label htmlFor="token" className="mb-1 block text-sm font-medium text-slate-700">
                Invite token
              </label>
              <input
                id="token"
                name="token"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Must include uppercase, lowercase, and a number.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {isSubmitting ? 'Activating...' : 'Activate account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
