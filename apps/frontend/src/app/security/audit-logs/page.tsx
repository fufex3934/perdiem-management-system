'use client';

import { Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { SecurityAuditLog } from '@/lib/security-api';
import * as securityApi from '@/lib/security-api';

const ACTION_LABELS: Record<string, string> = {
  'auth.login_success': 'Login success',
  'auth.login_failed': 'Login failed',
  'auth.logout': 'Logout',
  'auth.register_tenant': 'Tenant registered',
  'auth.refresh_token': 'Token refresh',
  'auth.accept_invite': 'Invite accepted',
  'user.updated': 'User updated',
  'user.deleted': 'User deleted',
  'user.invite_created': 'Invite created',
  'user.invite_revoked': 'Invite revoked',
  'finance.payment_paid': 'Payment marked paid',
  'finance.payment_failed': 'Payment marked failed',
};

export default function SecurityAuditLogsPage() {
  const auth = useRequireAuth({ check: (a) => a.canViewSecurityAudit });
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;

    const result = await securityApi.listAuditLogs(auth.accessToken, auth.tenantId, {
      action: actionFilter || undefined,
      success: successFilter === '' ? undefined : successFilter === 'true',
    });

    setLogs(result.items);
    setTotal(result.total);
    setLoading(false);
  }, [auth.accessToken, auth.tenantId, actionFilter, successFilter]);

  useEffect(() => {
    if (auth.ready) loadLogs().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadLogs]);

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Security audit"
          description={`${total} events recorded`}
        />

        {error && <ErrorAlert message={error} />}

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Audit log
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-44"
              >
                <option value="">All actions</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                value={successFilter}
                onChange={(e) => setSuccessFilter(e.target.value)}
                className="w-36"
              >
                <option value="">All outcomes</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoading />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No audit logs"
                description="Security events will appear here as they occur."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </TableCell>
                      <TableCell>{log.actorEmail ?? log.userId ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.ip}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
