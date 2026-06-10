import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { TravelRequest, TravelRequestDocument } from './schemas/travel-request.schema';

export interface ListTravelRequestsFilter {
  userId?: string;
  status?: TravelRequestStatus;
}

@Injectable()
export class TravelRequestRepository {
  constructor(
    @InjectModel(TravelRequest.name)
    private readonly travelRequestModel: Model<TravelRequestDocument>,
  ) {}

  create(data: Partial<TravelRequest>): Promise<TravelRequestDocument> {
    return this.travelRequestModel.create(data);
  }

  findByIdInTenant(
    tenantId: string,
    requestId: string,
  ): Promise<TravelRequestDocument | null> {
    return this.travelRequestModel
      .findOne({
        _id: requestId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();
  }

  findAllInTenant(
    tenantId: string,
    filter: ListTravelRequestsFilter,
    page: number,
    limit: number,
  ): Promise<{ items: TravelRequestDocument[]; total: number }> {
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

    const skip = (page - 1) * limit;

    return Promise.all([
      this.travelRequestModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.travelRequestModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }

  updateInTenant(
    tenantId: string,
    requestId: string,
    update: Partial<TravelRequest>,
  ): Promise<TravelRequestDocument | null> {
    return this.travelRequestModel
      .findOneAndUpdate(
        {
          _id: requestId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
