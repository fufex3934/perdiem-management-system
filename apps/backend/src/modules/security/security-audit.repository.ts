import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { SecurityAuditLog, SecurityAuditLogDocument } from './schemas/security-audit-log.schema';

export interface ListSecurityAuditFilter {
  action?: SecurityAuditAction;
  userId?: string;
  success?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class SecurityAuditRepository {
  constructor(
    @InjectModel(SecurityAuditLog.name)
    private readonly auditModel: Model<SecurityAuditLogDocument>,
  ) {}

  create(data: Partial<SecurityAuditLog>): Promise<SecurityAuditLogDocument> {
    return this.auditModel.create(data);
  }

  findAllInTenant(
    tenantId: string,
    filter: ListSecurityAuditFilter,
    page: number,
    limit: number,
  ): Promise<{ items: SecurityAuditLogDocument[]; total: number }> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.userId) {
      query.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.success !== undefined) {
      query.success = filter.success;
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
      this.auditModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditModel.countDocuments(query).exec(),
    ]).then(([items, total]) => ({ items, total }));
  }
}
