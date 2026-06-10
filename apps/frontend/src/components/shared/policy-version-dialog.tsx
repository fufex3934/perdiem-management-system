'use client';

import { useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageLoading } from '@/components/shared/page-loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Policy, PolicyVersion } from '@/lib/policies-api';
import * as policiesApi from '@/lib/policies-api';

interface PolicyVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  accessToken: string;
  tenantId: string;
}

export function PolicyVersionDialog({
  open,
  onOpenChange,
  policy,
  accessToken,
  tenantId,
}: PolicyVersionDialogProps) {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !policy) {
      setVersions([]);
      setError(null);
      return;
    }

    setLoading(true);
    policiesApi
      .listPolicyVersions(accessToken, tenantId, policy.id)
      .then(setVersions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, policy, accessToken, tenantId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy version history</DialogTitle>
            <DialogDescription>
              {policy ? `“${policy.name}” — current v${policy.version ?? 1}` : 'Version history'}
            </DialogDescription>
          </DialogHeader>

          {error && <ErrorAlert message={error} />}

          {loading ? (
            <PageLoading />
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No previous versions yet. Edits create a new version snapshot.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {versions.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Version {entry.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {entry.snapshot.dailyRate} {entry.snapshot.currency}/day ·{' '}
                    {entry.snapshot.countryCode} · priority {entry.snapshot.priority}
                  </p>
                  {entry.changedByEmail && (
                    <p className="mt-1 text-xs text-muted-foreground">By {entry.changedByEmail}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
