import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { HttpContext } from '@/common/interfaces/http-context.interface';
import { ListSecurityAuditQueryDto } from './dto/list-security-audit-query.dto';
import {
  PaginatedSecurityAuditLogsResponseDto,
  SecurityAuditLogResponseDto,
} from './dto/security-audit-log-response.dto';
import { SecurityAuditRepository } from './security-audit.repository';

export interface RecordSecurityAuditInput {
  tenantId?: string;
  userId?: string;
  actorEmail?: string;
  action: SecurityAuditAction;
  resourceType?: string;
  resourceId?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  httpContext?: HttpContext;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly securityAuditRepository: SecurityAuditRepository) {}

  record(input: RecordSecurityAuditInput): void {
    const httpContext = input.httpContext ?? {
      ip: 'unknown',
      userAgent: 'unknown',
      requestId: 'unknown',
    };

    void this.securityAuditRepository
      .create({
        tenantId: input.tenantId ? new Types.ObjectId(input.tenantId) : undefined,
        userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
        actorEmail: input.actorEmail,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        success: input.success,
        ip: httpContext.ip,
        userAgent: httpContext.userAgent,
        requestId: httpContext.requestId,
        metadata: input.metadata,
      })
      .catch((error: Error) => {
        this.logger.error('Failed to persist security audit log', {
          action: input.action,
          error: error.message,
        });
      });
  }

  async listAuditLogs(
    tenantId: string,
    query: ListSecurityAuditQueryDto,
  ): Promise<PaginatedSecurityAuditLogsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.securityAuditRepository.findAllInTenant(
      tenantId,
      {
        action: query.action,
        userId: query.userId,
        success: query.success,
        fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
        toDate: query.toDate ? this.endOfDay(new Date(query.toDate)) : undefined,
      },
      page,
      limit,
    );

    return {
      items: items.map((log) => SecurityAuditLogResponseDto.fromDocument(log)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }
}
