'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { registerTenant } = useAuth();

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
            Launch your organization in minutes.
          </h2>
          <p className="max-w-md text-zinc-400">
            Set up policies, invite your team, and start managing travel per diem with
            enterprise-grade controls.
          </p>
        </div>
        <p className="text-sm text-zinc-500">© Per Diem Management System</p>
      </div>

      <div className="flex items-center justify-center bg-muted/30 px-4 py-12">
        <AuthForm
          title="Register organization"
          description="Create your tenant and admin account to get started."
          submitLabel="Create organization"
          fields={[
            { name: 'tenantName', label: 'Organization name', placeholder: 'Acme Corporation' },
            { name: 'slug', label: 'Organization slug (optional)', placeholder: 'acme', required: false },
            { name: 'firstName', label: 'First name' },
            { name: 'lastName', label: 'Last name' },
            { name: 'email', label: 'Admin email', type: 'email' },
            { name: 'password', label: 'Password', type: 'password' },
          ]}
          onSubmit={async (values) => {
            await registerTenant({
              tenantName: values.tenantName,
              slug: values.slug || undefined,
              email: values.email,
              password: values.password,
              firstName: values.firstName,
              lastName: values.lastName,
            });
          }}
          footer={
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
