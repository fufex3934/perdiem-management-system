import Link from 'next/link';
import { ArrowRight, BarChart3, CreditCard, Plane, Shield } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

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
  const apiHealthy = health?.status === 'ok';

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              P
            </div>
            <span className="font-semibold">Per Diem</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Sign in
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'sm' }))}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium text-primary">Enterprise per diem platform</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Travel spend management, built for modern teams
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Policies, approvals, payments, and analytics in one multi-tenant workspace — designed
            for finance and operations teams.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={Plane}
            title="Travel requests"
            description="Submit and track per diem trips with policy-aware calculations."
          />
          <FeatureCard
            icon={Shield}
            title="Approvals"
            description="Multi-step approval workflows with full audit trails."
          />
          <FeatureCard
            icon={CreditCard}
            title="Finance"
            description="Process payments and export spend data for accounting."
          />
          <FeatureCard
            icon={BarChart3}
            title="Analytics"
            description="Dashboards and reports to understand travel spend trends."
          />
        </div>
      </section>

      

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © Per Diem Management System
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              healthy ? 'bg-emerald-500' : 'bg-red-500',
            )}
          />
        </div>
        <p className="mt-2 truncate font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
