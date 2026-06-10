import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApprovalAuditLog,
  ApprovalAuditLogDocument,
} from './schemas/approval-audit-log.schema';

@Injectable()
export class ApprovalAuditRepository {
  constructor(
    @InjectModel(ApprovalAuditLog.name)
    private readonly auditModel: Model<ApprovalAuditLogDocument>,
  ) {}

  create(data: Partial<ApprovalAuditLog>): Promise<ApprovalAuditLogDocument> {
    return this.auditModel.create(data);
  }

  findByTravelRequestInTenant(
    tenantId: string,
    travelRequestId: string,
  ): Promise<ApprovalAuditLogDocument[]> {
    return this.auditModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        travelRequestId: new Types.ObjectId(travelRequestId),
      })
      .sort({ createdAt: 1 })
      .exec();
  }
}
