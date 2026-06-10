'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { AuthProvider } from './auth-context';
import { initSentryClient } from './sentry';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentryClient();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
