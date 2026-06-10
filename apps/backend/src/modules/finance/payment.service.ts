import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { Permission } from '@/common/enums/permission.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { roleHasPermission } from '@/common/rbac/role-permissions';
import { TravelRequestDocument } from '../travel-requests/schemas/travel-request.schema';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { MarkPaymentDto } from './dto/mark-payment.dto';
import {
  PaginatedPaymentsResponseDto,
  PaymentExportResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto';
import { PaymentRepository } from './payment.repository';
import { PerDiemPaymentDocument } from './schemas/per-diem-payment.schema';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async createFromApprovedTravelRequest(
    tenantId: string,
    travelRequest: TravelRequestDocument,
  ): Promise<PaymentResponseDto | null> {
    if (travelRequest.status !== TravelRequestStatus.APPROVED) {
      return null;
    }

    const existing = await this.paymentRepository.findByTravelRequestInTenant(
      tenantId,
      travelRequest._id.toString(),
    );

    if (existing) {
      return PaymentResponseDto.fromDocument(existing);
    }

    const payment = await this.paymentRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      travelRequestId: travelRequest._id,
      userId: travelRequest.userId,
      travelTitle: travelRequest.title,
      destinationCountryCode: travelRequest.destinationCountryCode,
      days: travelRequest.days,
      policyName: travelRequest.policyName,
      amount: travelRequest.totalAmount,
      currency: travelRequest.currency,
      status: PaymentStatus.PENDING,
    });

    return PaymentResponseDto.fromDocument(payment);
  }

  async list(
    actor: AuthenticatedUser,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const canReadAll = roleHasPermission(actor.role, Permission.FINANCE_READ_ALL);
    const filter = this.buildFilter(query, canReadAll ? undefined : actor.userId);

    const { items, total } = await this.paymentRepository.findAllInTenant(
      actor.tenantId,
      filter,
      page,
      limit,
    );

    return {
      items: items.map((payment) => PaymentResponseDto.fromDocument(payment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(actor: AuthenticatedUser, paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.getPaymentOrThrow(actor.tenantId, paymentId);
    this.ensureCanAccess(actor, payment);
    return PaymentResponseDto.fromDocument(payment);
  }

  async markPaid(
    actor: AuthenticatedUser,
    paymentId: string,
    dto: MarkPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.getPaymentOrThrow(actor.tenantId, paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessException(
        {
          code: ErrorCodes.PAYMENT_INVALID_STATUS,
          message: 'Only pending payments can be marked as paid',
          details: { status: payment.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const updated = await this.paymentRepository.updateInTenant(actor.tenantId, paymentId, {
      status: PaymentStatus.PAID,
      paymentReference: dto.paymentReference?.trim() ?? '',
      notes: dto.notes?.trim() ?? payment.notes,
      processedBy: new Types.ObjectId(actor.userId),
      paidAt: now,
    });

    return PaymentResponseDto.fromDocument(updated!);
  }

  async markFailed(
    actor: AuthenticatedUser,
    paymentId: string,
    dto: MarkPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.getPaymentOrThrow(actor.tenantId, paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BusinessException(
        {
          code: ErrorCodes.PAYMENT_INVALID_STATUS,
          message: 'Only pending payments can be marked as failed',
          details: { status: payment.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.paymentRepository.updateInTenant(actor.tenantId, paymentId, {
      status: PaymentStatus.FAILED,
      paymentReference: dto.paymentReference?.trim() ?? '',
      notes: dto.notes?.trim() ?? payment.notes,
      processedBy: new Types.ObjectId(actor.userId),
    });

    return PaymentResponseDto.fromDocument(updated!);
  }

  async exportCsv(
    actor: AuthenticatedUser,
    query: ListPaymentsQueryDto,
  ): Promise<PaymentExportResponseDto> {
    const canReadAll = roleHasPermission(actor.role, Permission.FINANCE_READ_ALL);
    const filter = this.buildFilter(query, canReadAll ? undefined : actor.userId);
    const items = await this.paymentRepository.findAllForExport(actor.tenantId, filter);

    const headers = [
      'payment_id',
      'travel_request_id',
      'user_id',
      'travel_title',
      'destination',
      'days',
      'policy_name',
      'amount',
      'currency',
      'status',
      'payment_reference',
      'notes',
      'paid_at',
      'created_at',
    ];

    const rows = items.map((payment) =>
      [
        payment._id.toString(),
        payment.travelRequestId.toString(),
        payment.userId.toString(),
        payment.travelTitle,
        payment.destinationCountryCode,
        payment.days,
        payment.policyName,
        payment.amount,
        payment.currency,
        payment.status,
        payment.paymentReference,
        payment.notes,
        payment.paidAt?.toISOString() ?? '',
        payment.createdAt?.toISOString() ?? '',
      ]
        .map((value) => this.escapeCsvValue(String(value)))
        .join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const dateStamp = new Date().toISOString().slice(0, 10);

    return {
      filename: `per-diem-payments-${dateStamp}.csv`,
      csv,
      rowCount: items.length,
    };
  }

  private buildFilter(
    query: ListPaymentsQueryDto,
    userId?: string,
  ): {
    userId?: string;
    status?: PaymentStatus;
    fromDate?: Date;
    toDate?: Date;
  } {
    return {
      userId,
      status: query.status,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? this.endOfDay(new Date(query.toDate)) : undefined,
    };
  }

  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async getPaymentOrThrow(
    tenantId: string,
    paymentId: string,
  ): Promise<PerDiemPaymentDocument> {
    const payment = await this.paymentRepository.findByIdInTenant(tenantId, paymentId);

    if (!payment) {
      throw new BusinessException(
        {
          code: ErrorCodes.PAYMENT_NOT_FOUND,
          message: 'Payment not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return payment;
  }

  private ensureCanAccess(actor: AuthenticatedUser, payment: PerDiemPaymentDocument): void {
    if (roleHasPermission(actor.role, Permission.FINANCE_READ_ALL)) {
      return;
    }

    if (payment.userId.toString() !== actor.userId) {
      throw new BusinessException(
        {
          code: ErrorCodes.PAYMENT_FORBIDDEN,
          message: 'You do not have access to this payment',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
