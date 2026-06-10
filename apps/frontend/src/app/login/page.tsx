'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import * as authApi from '@/lib/auth-api';
import { env } from '@/lib/env';

export default function LoginPage() {
  const { login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [samlEnabled, setSamlEnabled] = useState(false);
  const [oauthError, setOauthError] = useState(false);

  useEffect(() => {
    authApi
      .getOAuthConfig()
      .then((config) => {
        setGoogleEnabled(config.google);
        setMicrosoftEnabled(config.microsoft);
        setSamlEnabled(config.saml);
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    setOauthError(params.get('oauth_error') === '1');
  }, []);

  function handleOAuthSignIn(provider: 'google' | 'microsoft' | 'saml') {
    if (!tenantSlug.trim()) return;
    window.location.href = `${env.apiUrl}/auth/${provider}?tenantSlug=${encodeURIComponent(tenantSlug.trim())}`;
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
          <h2 className="text-3xl font-semibold tracking-tight">
            Enterprise travel spend, simplified.
          </h2>
          <p className="max-w-md text-zinc-400">
            Manage policies, approvals, payments, and analytics in one workspace built for
            multi-tenant teams.
          </p>
        </div>
        <p className="text-sm text-zinc-500">© Per Diem Management System</p>
      </div>

      <div className="flex items-center justify-center bg-muted/30 px-4 py-12">
        <AuthForm
          title="Sign in"
          description="Access your organization's per diem workspace."
          submitLabel="Sign in"
          fields={[
            { name: 'tenantSlug', label: 'Organization slug', placeholder: 'acme' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com' },
            { name: 'password', label: 'Password', type: 'password' },
          ]}
          onFieldChange={(name, value) => {
            if (name === 'tenantSlug') setTenantSlug(value);
          }}
          onSubmit={async (values) => {
            await login({
              tenantSlug: values.tenantSlug,
              email: values.email,
              password: values.password,
            });
          }}
          extra={
            <>
              {oauthError && (
                <p className="mt-4 text-sm text-destructive">
                  SSO sign-in failed. Try again or use email and password.
                </p>
              )}
              {(googleEnabled || microsoftEnabled || samlEnabled) && (
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  {googleEnabled && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={!tenantSlug.trim()}
                      onClick={() => handleOAuthSignIn('google')}
                    >
                      Continue with Google
                    </Button>
                  )}
                  {microsoftEnabled && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={!tenantSlug.trim()}
                      onClick={() => handleOAuthSignIn('microsoft')}
                    >
                      Continue with Microsoft
                    </Button>
                  )}
                  {samlEnabled && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={!tenantSlug.trim()}
                      onClick={() => handleOAuthSignIn('saml')}
                    >
                      Continue with SSO
                    </Button>
                  )}
                  {!tenantSlug.trim() && (
                    <p className="text-center text-xs text-muted-foreground">
                      Enter your organization slug above first
                    </p>
                  )}
                </div>
              )}
            </>
          }
          footer={
            <>
              New organization?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register tenant
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
