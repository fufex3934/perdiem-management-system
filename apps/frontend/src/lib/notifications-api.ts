import { apiClient } from './api-client';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCount {
  count: number;
}

function authOptions(token: string, tenantId: string) {
  return { token, tenantId };
}

export async function listNotifications(
  token: string,
  tenantId: string,
  params?: { page?: number; limit?: number; unreadOnly?: boolean },
): Promise<PaginatedNotifications> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.unreadOnly) {
    query.set('unreadOnly', 'true');
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  const response = await apiClient.get<PaginatedNotifications>(
    `/notifications${suffix}`,
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function getUnreadCount(
  token: string,
  tenantId: string,
): Promise<UnreadCount> {
  const response = await apiClient.get<UnreadCount>(
    '/notifications/unread-count',
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function markNotificationRead(
  token: string,
  tenantId: string,
  notificationId: string,
): Promise<Notification> {
  const response = await apiClient.patch<Notification>(
    `/notifications/${notificationId}/read`,
    {},
    authOptions(token, tenantId),
  );
  return response.data;
}

export async function markAllNotificationsRead(
  token: string,
  tenantId: string,
): Promise<{ updated: number }> {
  const response = await apiClient.post<{ updated: number }>(
    '/notifications/mark-all-read',
    {},
    authOptions(token, tenantId),
  );
  return response.data;
}
