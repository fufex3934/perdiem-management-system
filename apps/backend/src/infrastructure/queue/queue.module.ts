import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { DynamicModule, Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { AllConfig } from '../config/configuration';
import { DomainEventProcessor } from './domain-event.processor';
import { DOMAIN_EVENTS_QUEUE } from './queue.constants';

@Module({})
export class QueueModule {
  static forRootOptional(): DynamicModule {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      return {
        module: QueueModule,
        providers: [{ provide: getQueueToken(DOMAIN_EVENTS_QUEUE), useValue: undefined }],
        exports: [getQueueToken(DOMAIN_EVENTS_QUEUE)],
      };
    }

    return {
      module: QueueModule,
      imports: [
        forwardRef(() => NotificationsModule),
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService<AllConfig, true>) => ({
            connection: { url: configService.get('redis', { infer: true }).url! },
          }),
        }),
        BullModule.registerQueue({ name: DOMAIN_EVENTS_QUEUE }),
      ],
      providers: [DomainEventProcessor],
      exports: [BullModule, getQueueToken(DOMAIN_EVENTS_QUEUE)],
    };
  }
}
