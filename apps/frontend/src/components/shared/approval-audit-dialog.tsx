'use client';

import { useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageLoading } from '@/components/shared/page-loading';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ApprovalAuditEntry } from '@/lib/approvals-api';
import * as approvalsApi from '@/lib/approvals-api';

interface ApprovalAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
  requestTitle?: string;
  accessToken: string;
  tenantId: string;
}

export function ApprovalAuditDialog({
  open,
  onOpenChange,
  requestId,
  requestTitle,
  accessToken,
  tenantId,
}: ApprovalAuditDialogProps) {
  const [entries, setEntries] = useState<ApprovalAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !requestId) {
      setEntries([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    approvalsApi
      .getAuditTrail(accessToken, tenantId, requestId)
      .then(setEntries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, requestId, accessToken, tenantId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval audit trail</DialogTitle>
            <DialogDescription>
              {requestTitle ? `History for “${requestTitle}”` : 'Approval step history'}
            </DialogDescription>
          </DialogHeader>

          {error && <ErrorAlert message={error} />}

          {loading ? (
            <PageLoading />
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                    {entry.step != null && (
                      <Badge variant="secondary">Step {entry.step}</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {entry.actorRole.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {entry.previousStatus.replace(/_/g, ' ')} → {entry.newStatus.replace(/_/g, ' ')}
                  </p>
                  {entry.comment && (
                    <p className="mt-2 text-muted-foreground">&ldquo;{entry.comment}&rdquo;</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
