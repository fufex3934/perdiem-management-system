import { Injectable } from '@nestjs/common';
import { UserRole } from '@/common/enums/user-role.enum';
import { EventBusService } from './event-bus.service';
import {
  DomainEventType,
  PaymentEventPayload,
  TravelRequestEventPayload,
} from './events/domain-event.type';

@Injectable()
export class NotificationPublisher {
  constructor(private readonly eventBus: EventBusService) {}

  async travelRequestSubmitted(input: {
    tenantId: string;
    travelRequestId: string;
    requesterId: string;
    title: string;
    requiredRole: UserRole;
  }): Promise<void> {
    await this.eventBus.publish(DomainEventType.TRAVEL_REQUEST_SUBMITTED, {
      tenantId: input.tenantId,
      travelRequestId: input.travelRequestId,
      requesterId: input.requesterId,
      title: input.title,
      requiredRole: input.requiredRole,
    } satisfies TravelRequestEventPayload);
  }

  async travelRequestStepApproved(input: {
    tenantId: string;
    travelRequestId: string;
    requesterId: string;
    title: string;
    requiredRole: UserRole;
  }): Promise<void> {
    await this.eventBus.publish(DomainEventType.TRAVEL_REQUEST_STEP_APPROVED, {
      tenantId: input.tenantId,
      travelRequestId: input.travelRequestId,
      requesterId: input.requesterId,
      title: input.title,
      requiredRole: input.requiredRole,
    } satisfies TravelRequestEventPayload);
  }

  async travelRequestApproved(input: {
    tenantId: string;
    travelRequestId: string;
    requesterId: string;
    title: string;
  }): Promise<void> {
    await this.eventBus.publish(DomainEventType.TRAVEL_REQUEST_APPROVED, {
      tenantId: input.tenantId,
      travelRequestId: input.travelRequestId,
      requesterId: input.requesterId,
      title: input.title,
    } satisfies TravelRequestEventPayload);
  }

  async travelRequestRejected(input: {
    tenantId: string;
    travelRequestId: string;
    requesterId: string;
    title: string;
  }): Promise<void> {
    await this.eventBus.publish(DomainEventType.TRAVEL_REQUEST_REJECTED, {
      tenantId: input.tenantId,
      travelRequestId: input.travelRequestId,
      requesterId: input.requesterId,
      title: input.title,
    } satisfies TravelRequestEventPayload);
  }

  async paymentCreated(input: PaymentEventPayload): Promise<void> {
    await this.eventBus.publish(DomainEventType.PAYMENT_CREATED, input);
  }

  async paymentPaid(input: PaymentEventPayload): Promise<void> {
    await this.eventBus.publish(DomainEventType.PAYMENT_PAID, input);
  }
}
