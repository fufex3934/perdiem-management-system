'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageLoading } from '@/components/shared/page-loading';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError } from '@/lib/api-client';

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeOAuthSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Missing OAuth exchange code.');
      return;
    }

    completeOAuthSignIn(code).catch((err: unknown) => {
      if (err instanceof ApiClientError) {
        setError(err.body.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google sign-in failed.');
      }
    });
  }, [searchParams, completeOAuthSignIn]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorAlert message={error} />
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => router.replace('/login')}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return <PageLoading />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
