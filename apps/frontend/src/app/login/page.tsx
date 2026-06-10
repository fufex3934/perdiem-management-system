'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <AuthForm
        title="Sign in"
        description="Access your organization's per diem workspace."
        submitLabel="Sign in"
        fields={[
          { name: 'tenantSlug', label: 'Organization slug', placeholder: 'acme-corp' },
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
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Register tenant
            </Link>
          </>
        }
      />
    </main>
  );
}
