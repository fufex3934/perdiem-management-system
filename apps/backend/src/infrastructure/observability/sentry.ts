import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || initialized) {
    return initialized;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? '1.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });

  initialized = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureException(
  exception: unknown,
  context?: { requestId?: string; path?: string },
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag('request_id', context.requestId);
    if (context?.path) scope.setTag('path', context.path);
    Sentry.captureException(exception);
  });
}
