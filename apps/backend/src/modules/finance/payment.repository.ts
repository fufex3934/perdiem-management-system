import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { PerDiemPayment, PerDiemPaymentDocument } from './schemas/per-diem-payment.schema';

export interface ListPaymentsFilter {
  userId?: string;
  status?: PaymentStatus;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(PerDiemPayment.name)
    private readonly paymentModel: Model<PerDiemPaymentDocument>,
  ) {}

  create(data: Partial<PerDiemPayment>): Promise<PerDiemPaymentDocument> {
    return this.paymentModel.create(data);
  }

  findByIdInTenant(
    tenantId: string,
    paymentId: string,
  ): Promise<PerDiemPaymentDocument | null> {
    return this.paymentModel
      .findOne({
        _id: paymentId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();
  }

  findByTravelRequestInTenant(
    tenantId: string,
    travelRequestId: string,
  ): Promise<PerDiemPaymentDocument | null> {
    return this.paymentModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        travelRequestId: new Types.ObjectId(travelRequestId),
        isDeleted: false,
      })
      .exec();
  }

  findAllInTenant(
    tenantId: string,
    filter: ListPaymentsFilter,
    page: number,
    limit: number,
  ): Promise<{ items: PerDiemPaymentDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.userId) {
      query.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.fromDate || filter.toDate) {
      query.createdAt = {};
      if (filter.fromDate) {
        (query.createdAt as Record<string, Date>).$gte = filter.fromDate;
      }
      if (filter.toDate) {
        (query.createdAt as Record<string, Date>).$lte = filter.toDate;
      }
    }

    const skip = (page - 1) * limit;

    return Promise.all([
      this.paymentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }

  findAllForExport(
    tenantId: string,
    filter: ListPaymentsFilter,
  ): Promise<PerDiemPaymentDocument[]> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.userId) {
      query.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.fromDate || filter.toDate) {
      query.createdAt = {};
      if (filter.fromDate) {
        (query.createdAt as Record<string, Date>).$gte = filter.fromDate;
      }
      if (filter.toDate) {
        (query.createdAt as Record<string, Date>).$lte = filter.toDate;
      }
    }

    return this.paymentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  updateInTenant(
    tenantId: string,
    paymentId: string,
    update: Partial<PerDiemPayment>,
  ): Promise<PerDiemPaymentDocument | null> {
    return this.paymentModel
      .findOneAndUpdate(
        {
          _id: paymentId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
