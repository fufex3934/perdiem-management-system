import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { SecurityAuditLogDocument } from '../schemas/security-audit-log.schema';

export class SecurityAuditLogResponseDto {
  id: string;
  tenantId: string | null;
  userId: string | null;
  actorEmail: string | null;
  action: SecurityAuditAction;
  resourceType: string | null;
  resourceId: string | null;
  success: boolean;
  ip: string;
  userAgent: string;
  requestId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;

  static fromDocument(log: SecurityAuditLogDocument): SecurityAuditLogResponseDto {
    return {
      id: log._id.toString(),
      tenantId: log.tenantId?.toString() ?? null,
      userId: log.userId?.toString() ?? null,
      actorEmail: log.actorEmail ?? null,
      action: log.action,
      resourceType: log.resourceType ?? null,
      resourceId: log.resourceId ?? null,
      success: log.success,
      ip: log.ip,
      userAgent: log.userAgent,
      requestId: log.requestId,
      metadata: log.metadata ?? null,
      createdAt: (log.createdAt ?? new Date()).toISOString(),
    };
  }
}

export class PaginatedSecurityAuditLogsResponseDto {
  items: SecurityAuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
