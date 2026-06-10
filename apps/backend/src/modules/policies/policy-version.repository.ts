import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PolicyVersion, PolicyVersionDocument } from './schemas/policy-version.schema';

@Injectable()
export class PolicyVersionRepository {
  constructor(
    @InjectModel(PolicyVersion.name)
    private readonly versionModel: Model<PolicyVersionDocument>,
  ) {}

  create(data: Partial<PolicyVersion>): Promise<PolicyVersionDocument> {
    return this.versionModel.create(data);
  }

  findByPolicyInTenant(
    tenantId: string,
    policyId: string,
  ): Promise<PolicyVersionDocument[]> {
    return this.versionModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        policyId: new Types.ObjectId(policyId),
      })
      .sort({ version: -1 })
      .exec();
  }
}
