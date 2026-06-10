import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DOMAIN_EVENTS_QUEUE } from '@/infrastructure/queue/queue.constants';
import { AllConfig } from '@/infrastructure/config/configuration';
import { DomainEventPayload, DomainEventType } from './events/domain-event.type';
import { NotificationEventHandler } from './notification-event.handler';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly asyncMode: boolean;

  constructor(
    private readonly configService: ConfigService<AllConfig, true>,
    private readonly notificationEventHandler: NotificationEventHandler,
    @Optional() @InjectQueue(DOMAIN_EVENTS_QUEUE) private readonly queue?: Queue,
  ) {
    this.asyncMode = Boolean(this.configService.get('redis', { infer: true }).enabled && this.queue);
    if (this.asyncMode) {
      this.logger.log('Domain events will be processed asynchronously via Redis/BullMQ');
    } else {
      this.logger.log('Domain events will be processed synchronously (Redis not configured)');
    }
  }

  isAsyncMode(): boolean {
    return this.asyncMode;
  }

  async publish(eventType: DomainEventType, payload: DomainEventPayload): Promise<void> {
    if (this.asyncMode && this.queue) {
      await this.queue.add(
        'process',
        { type: eventType, payload },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      return;
    }

    await this.notificationEventHandler.handle(eventType, payload);
  }
}
