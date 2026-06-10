import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../users/user.module';
import { EventBusService } from './event-bus.service';
import { NotificationEventHandler } from './notification-event.handler';
import { NotificationPublisher } from './notification.publisher';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    UserModule,
  ],
  controllers: [NotificationsController],
  providers: [
    EventBusService,
    NotificationEventHandler,
    NotificationRepository,
    NotificationService,
    NotificationPublisher,
  ],
  exports: [NotificationPublisher, NotificationService, EventBusService, NotificationEventHandler],
})
export class NotificationsModule {}
