import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { PerDiemPolicy, PerDiemPolicyDocument } from './schemas/per-diem-policy.schema';

export interface ListPoliciesFilter {
  countryCode?: string;
  role?: UserRole;
  status?: PolicyStatus;
}

@Injectable()
export class PolicyRepository {
  constructor(
    @InjectModel(PerDiemPolicy.name)
    private readonly policyModel: Model<PerDiemPolicyDocument>,
  ) {}

  create(data: Partial<PerDiemPolicy>): Promise<PerDiemPolicyDocument> {
    return this.policyModel.create(data);
  }

  findByIdInTenant(
    tenantId: string,
    policyId: string,
  ): Promise<PerDiemPolicyDocument | null> {
    return this.policyModel
      .findOne({
        _id: policyId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();
  }

  findAllInTenant(
    tenantId: string,
    filter: ListPoliciesFilter,
    page: number,
    limit: number,
  ): Promise<{ items: PerDiemPolicyDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filter.countryCode) {
      query.countryCode = filter.countryCode.toUpperCase();
    }

    if (filter.role) {
      query.role = filter.role;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    const skip = (page - 1) * limit;

    return Promise.all([
      this.policyModel.find(query).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.policyModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }

  findMatchingPolicies(
    tenantId: string,
    countryCode: string,
    role: UserRole,
    referenceDate: Date,
  ): Promise<PerDiemPolicyDocument[]> {
    return this.policyModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        countryCode: countryCode.toUpperCase(),
        status: PolicyStatus.ACTIVE,
        isDeleted: false,
        $or: [{ role }, { role: null }],
        $and: [
          {
            $or: [
              { effectiveFrom: null },
              { effectiveFrom: { $lte: referenceDate } },
            ],
          },
          {
            $or: [
              { effectiveTo: null },
              { effectiveTo: { $gte: referenceDate } },
            ],
          },
        ],
      })
      .sort({ priority: -1, role: -1 })
      .exec();
  }

  existsDuplicateInTenant(
    tenantId: string,
    countryCode: string,
    role: UserRole | null,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      countryCode: countryCode.toUpperCase(),
      role: role ?? null,
      name: name.trim(),
      isDeleted: false,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return this.policyModel.exists(query).then((result) => Boolean(result));
  }

  updateInTenant(
    tenantId: string,
    policyId: string,
    update: Partial<PerDiemPolicy>,
  ): Promise<PerDiemPolicyDocument | null> {
    return this.policyModel
      .findOneAndUpdate(
        {
          _id: policyId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { $set: update },
        { returnDocument: 'after' },
      )
      .exec();
  }

  softDeleteInTenant(tenantId: string, policyId: string): Promise<boolean> {
    return this.policyModel
      .updateOne(
        {
          _id: policyId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { isDeleted: true, deletedAt: new Date(), status: PolicyStatus.INACTIVE },
      )
      .exec()
      .then((result) => result.modifiedCount > 0);
  }
}
