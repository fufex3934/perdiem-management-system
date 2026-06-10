'use client';

import { useEffect } from 'react';
import { captureClientException } from '@/lib/sentry';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f4f4f5',
          color: '#18181b',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e4e4e7',
            background: '#fff',
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.08)',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#71717a' }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
