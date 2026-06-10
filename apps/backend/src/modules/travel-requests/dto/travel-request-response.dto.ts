import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { ApprovalStepResponseDto } from './approval-audit-log-response.dto';
import { TravelRequestDocument } from '../schemas/travel-request.schema';

export class TravelRequestResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  requesterRole: UserRole;
  title: string;
  purpose: string;
  destinationCountryCode: string;
  destinationCity: string;
  startDate: Date;
  endDate: Date;
  days: number;
  policyId: string;
  policyName: string;
  dailyRate: number;
  currency: string;
  totalAmount: number;
  appliedPolicyRole: UserRole | null;
  status: TravelRequestStatus;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  approvalSteps: ApprovalStepResponseDto[];
  currentStepIndex: number;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionComment: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDocument(request: TravelRequestDocument): TravelRequestResponseDto {
    return {
      id: request._id.toString(),
      tenantId: request.tenantId.toString(),
      userId: request.userId.toString(),
      requesterRole: request.requesterRole,
      title: request.title,
      purpose: request.purpose,
      destinationCountryCode: request.destinationCountryCode,
      destinationCity: request.destinationCity,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days,
      policyId: request.policyId.toString(),
      policyName: request.policyName,
      dailyRate: request.dailyRate,
      currency: request.currency,
      totalAmount: request.totalAmount,
      appliedPolicyRole: request.appliedPolicyRole,
      status: request.status,
      submittedAt: request.submittedAt,
      cancelledAt: request.cancelledAt,
      approvalSteps: request.approvalSteps.map((step) =>
        ApprovalStepResponseDto.fromStep(step),
      ),
      currentStepIndex: request.currentStepIndex,
      approvedAt: request.approvedAt,
      rejectedAt: request.rejectedAt,
      rejectionComment: request.rejectionComment,
      createdAt: request.createdAt ?? new Date(),
      updatedAt: request.updatedAt ?? new Date(),
    };
  }
}

export class PaginatedTravelRequestsResponseDto {
  items: TravelRequestResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
