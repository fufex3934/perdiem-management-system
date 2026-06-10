import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentryClient(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn || initialized || typeof window === 'undefined') {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });

  initialized = true;
}

export function captureClientException(error: unknown): void {
  if (!initialized) return;
  Sentry.captureException(error);
}
