import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../users/user.module';
import { EventBusService } from './event-bus.service';
import { NotificationEventListener } from './notification-event.listener';
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
    NotificationRepository,
    NotificationService,
    NotificationEventListener,
    NotificationPublisher,
  ],
  exports: [NotificationPublisher, NotificationService, EventBusService],
})
export class NotificationsModule {}
