import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';

interface HealthStatus {
  status: string;
  timestamp: string;
}

async function getHealthStatus(): Promise<HealthStatus | null> {
  try {
    const response = await apiClient.get<HealthStatus>('/health/live');
    return response.data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getHealthStatus();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl rounded-2xl border bg-white p-10 shadow-sm">
          <div className="mb-6 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Phase 2 — User Management + RBAC
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Per Diem Management System
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Enterprise multi-tenant SaaS platform for travel per diem management,
            approvals, and finance operations.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <StatusCard
              title="API Status"
              value={health?.status ?? 'unreachable'}
              description={
                health
                  ? `Last checked: ${new Date(health.timestamp).toLocaleString()}`
                  : 'Backend API is not responding'
              }
              healthy={health?.status === 'ok'}
            />
            <StatusCard
              title="API Endpoint"
              value={env.apiUrl}
              description="Configured backend URL"
              healthy={Boolean(health)}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Register organization
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              User management
            </Link>
          </div>

          <div className="mt-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Phase 2 Complete
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>✓ Permission-based RBAC with role guards</li>
              <li>✓ User CRUD with tenant isolation</li>
              <li>✓ Invite users + accept-invite flow</li>
              <li>✓ Admin user management UI</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusCard({
  title,
  value,
  description,
  healthy,
}: {
  title: string;
  value: string;
  description: string;
  healthy: boolean;
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            healthy ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
      </div>
      <p className="mt-2 truncate font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
