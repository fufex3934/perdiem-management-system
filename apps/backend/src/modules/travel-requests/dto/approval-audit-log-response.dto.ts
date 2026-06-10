import { ApprovalAuditAction } from '@/common/enums/approval-audit-action.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { ApprovalAuditLogDocument } from '../schemas/approval-audit-log.schema';
import { ApprovalStep } from '../schemas/travel-request.schema';

export class ApprovalStepResponseDto {
  step: number;
  requiredRole: UserRole;
  status: string;
  actedBy: string | null;
  actedAt: Date | null;
  comment: string;

  static fromStep(step: ApprovalStep): ApprovalStepResponseDto {
    return {
      step: step.step,
      requiredRole: step.requiredRole,
      status: step.status,
      actedBy: step.actedBy?.toString() ?? null,
      actedAt: step.actedAt,
      comment: step.comment,
    };
  }
}

export class ApprovalAuditLogResponseDto {
  id: string;
  travelRequestId: string;
  actorId: string;
  actorRole: UserRole;
  action: ApprovalAuditAction;
  step: number | null;
  comment: string;
  previousStatus: TravelRequestStatus;
  newStatus: TravelRequestStatus;
  createdAt: Date;

  static fromDocument(log: ApprovalAuditLogDocument): ApprovalAuditLogResponseDto {
    return {
      id: log._id.toString(),
      travelRequestId: log.travelRequestId.toString(),
      actorId: log.actorId.toString(),
      actorRole: log.actorRole,
      action: log.action,
      step: log.step,
      comment: log.comment,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      createdAt: log.createdAt ?? new Date(),
    };
  }
}
