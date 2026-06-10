'use client';

import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorAlert } from '@/components/shared/error-alert';
import { PageHeader } from '@/components/shared/page-header';
import { PageLoading } from '@/components/shared/page-loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Notification } from '@/lib/notifications-api';
import * as notificationsApi from '@/lib/notifications-api';

export default function NotificationsPage() {
  const auth = useRequireAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!auth.accessToken || !auth.tenantId) return;
    const [list, count] = await Promise.all([
      notificationsApi.listNotifications(auth.accessToken, auth.tenantId, {
        unreadOnly: showUnreadOnly,
      }),
      notificationsApi.getUnreadCount(auth.accessToken, auth.tenantId),
    ]);
    setNotifications(list.items);
    setUnreadCount(count.count);
  }, [auth.accessToken, auth.tenantId, showUnreadOnly]);

  useEffect(() => {
    if (auth.ready) loadNotifications().catch((err: Error) => setError(err.message));
  }, [auth.ready, loadNotifications]);

  if (!auth.ready) return <PageLoading />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          actions={
            unreadCount > 0 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  notificationsApi
                    .markAllNotificationsRead(auth.accessToken!, auth.tenantId!)
                    .then(loadNotifications)
                }
              >
                Mark all read
              </Button>
            ) : undefined
          }
        />

        {error && <ErrorAlert message={error} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inbox</CardTitle>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-input"
              />
              Unread only
            </label>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    n.readAt ? 'border-border/60' : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{n.title}</p>
                        <Badge variant="secondary">{n.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.readAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          notificationsApi
                            .markNotificationRead(auth.accessToken!, auth.tenantId!, n.id)
                            .then(loadNotifications)
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
