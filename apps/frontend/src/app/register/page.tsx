'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { registerTenant } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <AuthForm
        title="Register organization"
        description="Create your tenant and admin account to get started."
        submitLabel="Create organization"
        fields={[
          { name: 'tenantName', label: 'Organization name', placeholder: 'Acme Corporation' },
          {
            name: 'slug',
            label: 'Organization slug (optional)',
            placeholder: 'acme-corp',
            required: false,
          },
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
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </>
        }
      />
    </main>
  );
}
