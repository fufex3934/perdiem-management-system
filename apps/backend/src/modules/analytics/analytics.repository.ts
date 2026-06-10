import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { PerDiemPayment, PerDiemPaymentDocument } from '../finance/schemas/per-diem-payment.schema';
import { TravelRequest, TravelRequestDocument } from '../travel-requests/schemas/travel-request.schema';

export interface AnalyticsScopeFilter {
  tenantId: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}

interface AggregationRow {
  _id: string;
  count: number;
  totalAmount: number;
}

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectModel(TravelRequest.name)
    private readonly travelRequestModel: Model<TravelRequestDocument>,
    @InjectModel(PerDiemPayment.name)
    private readonly paymentModel: Model<PerDiemPaymentDocument>,
  ) {}

  async countTravelRequests(filter: AnalyticsScopeFilter): Promise<number> {
    return this.travelRequestModel.countDocuments(this.buildTravelMatch(filter));
  }

  async countPendingApprovals(filter: AnalyticsScopeFilter): Promise<number> {
    return this.travelRequestModel.countDocuments({
      ...this.buildTravelMatch(filter),
      status: TravelRequestStatus.PENDING_APPROVAL,
    });
  }

  async aggregateTravelByStatus(filter: AnalyticsScopeFilter): Promise<AggregationRow[]> {
    return this.travelRequestModel.aggregate<AggregationRow>([
      { $match: this.buildTravelMatch(filter) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateTravelByCountry(
    filter: AnalyticsScopeFilter,
    limit = 5,
  ): Promise<AggregationRow[]> {
    return this.travelRequestModel.aggregate<AggregationRow>([
      { $match: this.buildTravelMatch(filter) },
      {
        $group: {
          _id: '$destinationCountryCode',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
    ]);
  }

  async sumTravelPerDiem(filter: AnalyticsScopeFilter): Promise<number> {
    const result = await this.travelRequestModel.aggregate<{ total: number }>([
      { $match: this.buildTravelMatch(filter) },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async countPayments(filter: AnalyticsScopeFilter): Promise<number> {
    return this.paymentModel.countDocuments(this.buildPaymentMatch(filter));
  }

  async aggregatePaymentsByStatus(filter: AnalyticsScopeFilter): Promise<AggregationRow[]> {
    return this.paymentModel.aggregate<AggregationRow>([
      { $match: this.buildPaymentMatch(filter) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async sumPaymentsByStatus(
    filter: AnalyticsScopeFilter,
    status: PaymentStatus,
  ): Promise<number> {
    const result = await this.paymentModel.aggregate<{ total: number }>([
      { $match: { ...this.buildPaymentMatch(filter), status } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private buildTravelMatch(filter: AnalyticsScopeFilter): Record<string, unknown> {
    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(filter.tenantId),
      isDeleted: false,
    };

    if (filter.userId) {
      match.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.fromDate || filter.toDate) {
      match.createdAt = {};
      if (filter.fromDate) {
        (match.createdAt as Record<string, Date>).$gte = filter.fromDate;
      }
      if (filter.toDate) {
        (match.createdAt as Record<string, Date>).$lte = filter.toDate;
      }
    }

    return match;
  }

  private buildPaymentMatch(filter: AnalyticsScopeFilter): Record<string, unknown> {
    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(filter.tenantId),
      isDeleted: false,
    };

    if (filter.userId) {
      match.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.fromDate || filter.toDate) {
      match.createdAt = {};
      if (filter.fromDate) {
        (match.createdAt as Record<string, Date>).$gte = filter.fromDate;
      }
      if (filter.toDate) {
        (match.createdAt as Record<string, Date>).$lte = filter.toDate;
      }
    }

    return match;
  }
}
