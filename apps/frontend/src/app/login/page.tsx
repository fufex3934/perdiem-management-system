'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();

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
          onSubmit={async (values) => {
            await login({
              tenantSlug: values.tenantSlug,
              email: values.email,
              password: values.password,
            });
          }}
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
