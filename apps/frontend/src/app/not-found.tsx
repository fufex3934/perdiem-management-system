import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button type="button">Back to dashboard</Button>
      </Link>
    </div>
  );
}
