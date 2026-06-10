import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DomainEventType, DomainEventPayload } from '@/modules/notifications/events/domain-event.type';
import { NotificationEventHandler } from '@/modules/notifications/notification-event.handler';
import { DOMAIN_EVENTS_QUEUE } from './queue.constants';

export interface DomainEventJobData {
  type: DomainEventType;
  payload: DomainEventPayload;
}

@Processor(DOMAIN_EVENTS_QUEUE)
export class DomainEventProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventProcessor.name);

  constructor(private readonly notificationEventHandler: NotificationEventHandler) {
    super();
  }

  async process(job: Job<DomainEventJobData>): Promise<void> {
    this.logger.debug(`Processing domain event ${job.data.type} (job ${job.id})`);
    await this.notificationEventHandler.handle(job.data.type, job.data.payload);
  }
}
