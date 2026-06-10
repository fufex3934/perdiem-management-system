import { NotificationType } from '@/common/enums/notification-type.enum';
import { NotificationDocument } from '../schemas/notification.schema';

export class NotificationResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;

  static fromDocument(notification: NotificationDocument): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      tenantId: notification.tenantId.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId?.toString() ?? null,
      readAt: notification.readAt,
      createdAt: notification.createdAt ?? new Date(),
    };
  }
}

export class PaginatedNotificationsResponseDto {
  items: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UnreadCountResponseDto {
  count: number;
}
