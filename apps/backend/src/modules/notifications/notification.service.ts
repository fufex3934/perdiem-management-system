import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async list(
    actor: AuthenticatedUser,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.notificationRepository.findAllForUser(
      actor.tenantId,
      actor.userId,
      { unreadOnly: query.unreadOnly },
      page,
      limit,
    );

    return {
      items: items.map((item) => NotificationResponseDto.fromDocument(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(actor: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    const count = await this.notificationRepository.countUnreadForUser(
      actor.tenantId,
      actor.userId,
    );
    return { count };
  }

  async markRead(
    actor: AuthenticatedUser,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const updated = await this.notificationRepository.markReadForUser(
      actor.tenantId,
      actor.userId,
      notificationId,
    );

    if (!updated) {
      const existing = await this.notificationRepository.findByIdForUser(
        actor.tenantId,
        actor.userId,
        notificationId,
      );

      if (!existing) {
        throw new BusinessException(
          {
            code: ErrorCodes.NOTIFICATION_NOT_FOUND,
            message: 'Notification not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return NotificationResponseDto.fromDocument(existing);
    }

    return NotificationResponseDto.fromDocument(updated);
  }

  async markAllRead(actor: AuthenticatedUser): Promise<{ updated: number }> {
    const updated = await this.notificationRepository.markAllReadForUser(
      actor.tenantId,
      actor.userId,
    );
    return { updated };
  }

  async notifyUsers(input: {
    tenantId: string;
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    const uniqueUserIds = [...new Set(input.userIds)].filter(Boolean);
    if (uniqueUserIds.length === 0) {
      return;
    }

    await this.notificationRepository.createMany(
      uniqueUserIds.map((userId) => ({
        tenantId: new Types.ObjectId(input.tenantId),
        userId: new Types.ObjectId(userId),
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? '',
        entityId: input.entityId ? new Types.ObjectId(input.entityId) : null,
        readAt: null,
      })),
    );
  }
}
