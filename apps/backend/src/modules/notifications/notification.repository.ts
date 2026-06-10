import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface ListNotificationsFilter {
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  create(data: Partial<Notification>): Promise<NotificationDocument> {
    return this.notificationModel.create(data);
  }

  createMany(data: Partial<Notification>[]): Promise<NotificationDocument[]> {
    return this.notificationModel.insertMany(data) as Promise<NotificationDocument[]>;
  }

  findByIdForUser(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOne({
        _id: notificationId,
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  findAllForUser(
    tenantId: string,
    userId: string,
    filter: ListNotificationsFilter,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
    };

    if (filter.unreadOnly) {
      query.readAt = null;
    }

    const skip = (page - 1) * limit;

    return Promise.all([
      this.notificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }

  countUnreadForUser(tenantId: string, userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      readAt: null,
    });
  }

  markReadForUser(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findOneAndUpdate(
        {
          _id: notificationId,
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(userId),
          readAt: null,
        },
        { $set: { readAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  markAllReadForUser(tenantId: string, userId: string): Promise<number> {
    return this.notificationModel
      .updateMany(
        {
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(userId),
          readAt: null,
        },
        { $set: { readAt: new Date() } },
      )
      .exec()
      .then((result) => result.modifiedCount);
  }
}
