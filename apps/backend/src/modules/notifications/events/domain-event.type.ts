import { UserRole } from '@/common/enums/user-role.enum';

export enum DomainEventType {
  TRAVEL_REQUEST_SUBMITTED = 'travel_request.submitted',
  TRAVEL_REQUEST_STEP_APPROVED = 'travel_request.step_approved',
  TRAVEL_REQUEST_APPROVED = 'travel_request.approved',
  TRAVEL_REQUEST_REJECTED = 'travel_request.rejected',
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_PAID = 'payment.paid',
}

export interface TravelRequestEventPayload {
  tenantId: string;
  travelRequestId: string;
  requesterId: string;
  title: string;
  requiredRole?: UserRole;
}

export interface PaymentEventPayload {
  tenantId: string;
  paymentId: string;
  travelRequestId: string;
  userId: string;
  title: string;
  amount: number;
  currency: string;
}

export type DomainEventPayload = TravelRequestEventPayload | PaymentEventPayload;
