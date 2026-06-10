'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageLoading } from '@/components/shared/page-loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold">
            P
          </div>
          <span className="text-lg font-semibold">Per Diem</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Join your team.</h2>
          <p className="max-w-md text-zinc-400">
            Set your password to activate your account and start managing travel per diem.
          </p>
        </div>
        <p className="text-sm text-zinc-500">© Per Diem Management System</p>
      </div>

      <div className="flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Accept invite</CardTitle>
            <CardDescription>Set your password to activate your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {!token && (
                <div className="space-y-2">
                  <Label htmlFor="token">Invite token</Label>
                  <Input id="token" name="token" required />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
                <p className="text-xs text-muted-foreground">
                  Must include uppercase, lowercase, and a number.
                </p>
              </div>

              {error && <ErrorAlert message={error} />}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Activating…' : 'Activate account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
