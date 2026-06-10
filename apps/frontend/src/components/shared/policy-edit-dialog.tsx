'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { UserRole } from '@/lib/permissions';
import type { Policy, UpdatePolicyInput } from '@/lib/policies-api';
import * as policiesApi from '@/lib/policies-api';

interface PolicyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  accessToken: string;
  tenantId: string;
  onSaved: () => void;
}

export function PolicyEditDialog({
  open,
  onOpenChange,
  policy,
  accessToken,
  tenantId,
  onSaved,
}: PolicyEditDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open && policy) {
      setError(null);
      setFormKey((key) => key + 1);
    }
  }, [open, policy]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const roleValue = String(formData.get('role'));
    const statusValue = String(formData.get('status'));

    const input: UpdatePolicyInput = {
      name: String(formData.get('name')),
      description: String(formData.get('description') || ''),
      countryCode: String(formData.get('countryCode')).toUpperCase(),
      role: roleValue === 'all' ? null : roleValue,
      dailyRate: Number(formData.get('dailyRate')),
      currency: String(formData.get('currency')).toUpperCase(),
      priority: Number(formData.get('priority') || 0),
      status: statusValue,
    };

    try {
      await policiesApi.updatePolicy(accessToken, tenantId, policy.id, input);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit policy</DialogTitle>
            <DialogDescription>
              Changes create a new version snapshot. Current: v{policy.version ?? 1}
            </DialogDescription>
          </DialogHeader>

          {error && <ErrorAlert message={error} />}

          <form key={formKey} className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Policy name</Label>
              <Input id="edit-name" name="name" required defaultValue={policy.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                name="description"
                defaultValue={policy.description}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-countryCode">Country</Label>
                <Input
                  id="edit-countryCode"
                  name="countryCode"
                  required
                  maxLength={2}
                  defaultValue={policy.countryCode}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Input
                  id="edit-currency"
                  name="currency"
                  required
                  maxLength={3}
                  defaultValue={policy.currency}
                  className="uppercase"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-dailyRate">Daily rate</Label>
                <Input
                  id="edit-dailyRate"
                  name="dailyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={policy.dailyRate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  name="priority"
                  type="number"
                  min="0"
                  defaultValue={policy.priority}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  id="edit-role"
                  name="role"
                  defaultValue={policy.role ?? 'all'}
                >
                  <option value="all">All roles (default)</option>
                  <option value={UserRole.EMPLOYEE}>Employee</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.TENANT_ADMIN}>Tenant Admin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select id="edit-status" name="status" defaultValue={policy.status}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
