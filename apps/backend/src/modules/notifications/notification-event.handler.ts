import { Injectable } from '@nestjs/common';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { UserRepository } from '../users/user.repository';
import {
  DomainEventType,
  DomainEventPayload,
  PaymentEventPayload,
  TravelRequestEventPayload,
} from './events/domain-event.type';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationEventHandler {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
  ) {}

  async handle(eventType: DomainEventType, payload: DomainEventPayload): Promise<void> {
    switch (eventType) {
      case DomainEventType.TRAVEL_REQUEST_SUBMITTED:
        await this.handleTravelSubmitted(payload as TravelRequestEventPayload);
        break;
      case DomainEventType.TRAVEL_REQUEST_STEP_APPROVED:
        await this.handleStepApproved(payload as TravelRequestEventPayload);
        break;
      case DomainEventType.TRAVEL_REQUEST_APPROVED:
        await this.handleTravelApproved(payload as TravelRequestEventPayload);
        break;
      case DomainEventType.TRAVEL_REQUEST_REJECTED:
        await this.handleTravelRejected(payload as TravelRequestEventPayload);
        break;
      case DomainEventType.PAYMENT_CREATED:
        await this.handlePaymentCreated(payload as PaymentEventPayload);
        break;
      case DomainEventType.PAYMENT_PAID:
        await this.handlePaymentPaid(payload as PaymentEventPayload);
        break;
      default:
        break;
    }
  }

  private async handleTravelSubmitted(payload: TravelRequestEventPayload): Promise<void> {
    if (!payload.requiredRole) return;

    const approverIds = await this.getApproverIds(payload.tenantId, payload.requiredRole);
    const recipients = approverIds.filter((id) => id !== payload.requesterId);

    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: recipients,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${payload.title}" is awaiting your approval.`,
      entityType: 'travel_request',
      entityId: payload.travelRequestId,
    });
  }

  private async handleStepApproved(payload: TravelRequestEventPayload): Promise<void> {
    if (!payload.requiredRole) return;

    const approverIds = await this.getApproverIds(payload.tenantId, payload.requiredRole);
    const recipients = approverIds.filter((id) => id !== payload.requesterId);

    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: recipients,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required',
      message: `Travel request "${payload.title}" needs your final approval.`,
      entityType: 'travel_request',
      entityId: payload.travelRequestId,
    });
  }

  private async handleTravelApproved(payload: TravelRequestEventPayload): Promise<void> {
    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: [payload.requesterId],
      type: NotificationType.TRAVEL_APPROVED,
      title: 'Travel request approved',
      message: `Your travel request "${payload.title}" has been fully approved.`,
      entityType: 'travel_request',
      entityId: payload.travelRequestId,
    });
  }

  private async handleTravelRejected(payload: TravelRequestEventPayload): Promise<void> {
    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: [payload.requesterId],
      type: NotificationType.TRAVEL_REJECTED,
      title: 'Travel request rejected',
      message: `Your travel request "${payload.title}" was rejected.`,
      entityType: 'travel_request',
      entityId: payload.travelRequestId,
    });
  }

  private async handlePaymentCreated(payload: PaymentEventPayload): Promise<void> {
    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: [payload.userId],
      type: NotificationType.PAYMENT_CREATED,
      title: 'Per diem payment created',
      message: `A payment of ${payload.amount} ${payload.currency} was created for "${payload.title}".`,
      entityType: 'payment',
      entityId: payload.paymentId,
    });
  }

  private async handlePaymentPaid(payload: PaymentEventPayload): Promise<void> {
    await this.notificationService.notifyUsers({
      tenantId: payload.tenantId,
      userIds: [payload.userId],
      type: NotificationType.PAYMENT_PAID,
      title: 'Per diem payment completed',
      message: `Your payment of ${payload.amount} ${payload.currency} for "${payload.title}" has been processed.`,
      entityType: 'payment',
      entityId: payload.paymentId,
    });
  }

  private async getApproverIds(tenantId: string, role: UserRole): Promise<string[]> {
    const users = await this.userRepository.findActiveByRoleInTenant(tenantId, role);

    if (role !== UserRole.TENANT_ADMIN) {
      const admins = await this.userRepository.findActiveByRoleInTenant(
        tenantId,
        UserRole.TENANT_ADMIN,
      );
      const ids = new Set([
        ...users.map((user) => user._id.toString()),
        ...admins.map((user) => user._id.toString()),
      ]);
      return [...ids];
    }

    return users.map((user) => user._id.toString());
  }
}
