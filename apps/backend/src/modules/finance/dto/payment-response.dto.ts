import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { PerDiemPaymentDocument } from '../schemas/per-diem-payment.schema';

export class PaymentResponseDto {
  id: string;
  tenantId: string;
  travelRequestId: string;
  userId: string;
  travelTitle: string;
  destinationCountryCode: string;
  days: number;
  policyName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentReference: string;
  notes: string;
  processedBy: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromDocument(payment: PerDiemPaymentDocument): PaymentResponseDto {
    return {
      id: payment._id.toString(),
      tenantId: payment.tenantId.toString(),
      travelRequestId: payment.travelRequestId.toString(),
      userId: payment.userId.toString(),
      travelTitle: payment.travelTitle,
      destinationCountryCode: payment.destinationCountryCode,
      days: payment.days,
      policyName: payment.policyName,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentReference: payment.paymentReference,
      notes: payment.notes,
      processedBy: payment.processedBy?.toString() ?? null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt ?? new Date(),
      updatedAt: payment.updatedAt ?? new Date(),
    };
  }
}

export class PaginatedPaymentsResponseDto {
  items: PaymentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaymentExportResponseDto {
  filename: string;
  csv: string;
  rowCount: number;
}
