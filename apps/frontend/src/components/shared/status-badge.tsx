import { Badge } from '@/components/ui/badge';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  pending_approval: { label: 'Pending approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { label: status.replace(/_/g, ' '), variant: 'secondary' as const };
  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}
