'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Notification } from '@/lib/notifications-api';
import * as notificationsApi from '@/lib/notifications-api';

const TYPE_STYLES: Record<string, string> = {
  approval_required: 'bg-amber-100 text-amber-800',
  travel_approved: 'bg-emerald-100 text-emerald-800',
  travel_rejected: 'bg-red-100 text-red-800',
  payment_created: 'bg-blue-100 text-blue-800',
  payment_paid: 'bg-emerald-100 text-emerald-800',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, accessToken, tenantId, isLoading, isAuthenticated, logout } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!accessToken || !tenantId) return;

    const [list, count] = await Promise.all([
      notificationsApi.listNotifications(accessToken, tenantId, {
        unreadOnly: showUnreadOnly,
      }),
      notificationsApi.getUnreadCount(accessToken, tenantId),
    ]);

    setNotifications(list.items);
    setUnreadCount(count.count);
  }, [accessToken, tenantId, showUnreadOnly]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && accessToken && tenantId) {
      loadNotifications().catch((err: Error) => setError(err.message));
    }
  }, [isLoading, isAuthenticated, accessToken, tenantId, router, loadNotifications]);

  async function handleMarkRead(notificationId: string) {
    if (!accessToken || !tenantId) return;
    await notificationsApi.markNotificationRead(accessToken, tenantId, notificationId);
    await loadNotifications();
  }

  async function handleMarkAllRead() {
    if (!accessToken || !tenantId) return;
    await notificationsApi.markAllNotificationsRead(accessToken, tenantId);
    await loadNotifications();
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
              Dashboard
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                />
                Unread only
              </label>
              {unreadCount > 0 && (
                <button
                  onClick={() => handleMarkAllRead()}
                  className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {notifications.length === 0 && (
              <p className="text-sm text-slate-500">No notifications to show.</p>
            )}

            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-4 ${
                  notification.readAt ? 'bg-white' : 'border-blue-200 bg-blue-50/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{notification.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          TYPE_STYLES[notification.type] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
