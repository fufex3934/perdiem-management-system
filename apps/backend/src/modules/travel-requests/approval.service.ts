import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { ApprovalAuditAction } from '@/common/enums/approval-audit-action.enum';
import { ApprovalStepStatus } from '@/common/enums/approval-step-status.enum';
import { Permission } from '@/common/enums/permission.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { roleHasPermission } from '@/common/rbac/role-permissions';
import { ApprovalAuditRepository } from './approval-audit.repository';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalActionDto } from './dto/approval-action.dto';
import {
  ApprovalAuditLogResponseDto,
  ApprovalStepResponseDto,
} from './dto/approval-audit-log-response.dto';
import { ListPendingApprovalsQueryDto } from './dto/list-pending-approvals-query.dto';
import {
  PaginatedTravelRequestsResponseDto,
  TravelRequestResponseDto,
} from './dto/travel-request-response.dto';
import { ApprovalStep, TravelRequestDocument } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly travelRequestRepository: TravelRequestRepository,
    private readonly approvalAuditRepository: ApprovalAuditRepository,
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  async processSubmit(
    actor: AuthenticatedUser,
    request: TravelRequestDocument,
  ): Promise<TravelRequestResponseDto> {
    const approvalSteps = this.approvalWorkflowService.buildApprovalSteps(
      request.requesterRole,
    );
    const now = new Date();

    if (approvalSteps.length === 0) {
      const updated = await this.travelRequestRepository.updateInTenant(
        actor.tenantId,
        request._id.toString(),
        {
          status: TravelRequestStatus.APPROVED,
          submittedAt: now,
          approvedAt: now,
          approvalSteps: [],
          currentStepIndex: -1,
        },
      );

      await this.recordAudit({
        tenantId: actor.tenantId,
        travelRequestId: request._id.toString(),
        actor,
        action: ApprovalAuditAction.SUBMIT,
        step: null,
        comment: 'Auto-approved (tenant admin request)',
        previousStatus: TravelRequestStatus.DRAFT,
        newStatus: TravelRequestStatus.APPROVED,
      });

      return this.toResponse(updated!);
    }

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      request._id.toString(),
      {
        status: TravelRequestStatus.PENDING_APPROVAL,
        submittedAt: now,
        approvalSteps,
        currentStepIndex: 0,
        approvedAt: null,
        rejectedAt: null,
        rejectionComment: '',
      },
    );

    await this.recordAudit({
      tenantId: actor.tenantId,
      travelRequestId: request._id.toString(),
      actor,
      action: ApprovalAuditAction.SUBMIT,
      step: approvalSteps[0].step,
      comment: '',
      previousStatus: TravelRequestStatus.DRAFT,
      newStatus: TravelRequestStatus.PENDING_APPROVAL,
    });

    return this.toResponse(updated!);
  }

  async listPending(
    actor: AuthenticatedUser,
    query: ListPendingApprovalsQueryDto,
  ): Promise<PaginatedTravelRequestsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.travelRequestRepository.findAllInTenant(
      actor.tenantId,
      { status: TravelRequestStatus.PENDING_APPROVAL },
      page,
      limit,
    );

    const pendingForActor = items.filter((request) =>
      this.approvalWorkflowService.canActorApproveStep(actor, request),
    );

    return {
      items: pendingForActor.map((request) => this.toResponse(request)),
      total: pendingForActor.length,
      page,
      limit,
      totalPages: Math.ceil(pendingForActor.length / limit) || 1,
    };
  }

  async approve(
    actor: AuthenticatedUser,
    requestId: string,
    dto: ApprovalActionDto,
  ): Promise<TravelRequestResponseDto> {
    const request = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanApprove(actor, request);

    const previousStatus = request.status;
    const currentIndex = request.currentStepIndex;
    const steps = this.cloneApprovalSteps(request.approvalSteps);
    const currentStep = steps[currentIndex];
    const now = new Date();

    steps[currentIndex] = {
      step: currentStep.step,
      requiredRole: currentStep.requiredRole,
      status: ApprovalStepStatus.APPROVED,
      actedBy: new Types.ObjectId(actor.userId),
      actedAt: now,
      comment: dto.comment?.trim() ?? '',
    };

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= steps.length;

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      requestId,
      {
        approvalSteps: steps,
        currentStepIndex: isComplete ? -1 : nextIndex,
        status: isComplete
          ? TravelRequestStatus.APPROVED
          : TravelRequestStatus.PENDING_APPROVAL,
        approvedAt: isComplete ? now : null,
      },
    );

    await this.recordAudit({
      tenantId: actor.tenantId,
      travelRequestId: requestId,
      actor,
      action: ApprovalAuditAction.APPROVE,
      step: currentStep.step,
      comment: dto.comment?.trim() ?? '',
      previousStatus,
      newStatus: isComplete
        ? TravelRequestStatus.APPROVED
        : TravelRequestStatus.PENDING_APPROVAL,
    });

    return this.toResponse(updated!);
  }

  async reject(
    actor: AuthenticatedUser,
    requestId: string,
    dto: ApprovalActionDto,
  ): Promise<TravelRequestResponseDto> {
    const request = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanApprove(actor, request);

    const previousStatus = request.status;
    const currentIndex = request.currentStepIndex;
    const steps = this.cloneApprovalSteps(request.approvalSteps);
    const currentStep = steps[currentIndex];
    const now = new Date();
    const comment = dto.comment?.trim() ?? '';

    steps[currentIndex] = {
      step: currentStep.step,
      requiredRole: currentStep.requiredRole,
      status: ApprovalStepStatus.REJECTED,
      actedBy: new Types.ObjectId(actor.userId),
      actedAt: now,
      comment,
    };

    const updated = await this.travelRequestRepository.updateInTenant(
      actor.tenantId,
      requestId,
      {
        approvalSteps: steps,
        currentStepIndex: -1,
        status: TravelRequestStatus.REJECTED,
        rejectedAt: now,
        rejectionComment: comment,
      },
    );

    await this.recordAudit({
      tenantId: actor.tenantId,
      travelRequestId: requestId,
      actor,
      action: ApprovalAuditAction.REJECT,
      step: currentStep.step,
      comment,
      previousStatus,
      newStatus: TravelRequestStatus.REJECTED,
    });

    return this.toResponse(updated!);
  }

  async getAuditTrail(
    actor: AuthenticatedUser,
    requestId: string,
  ): Promise<ApprovalAuditLogResponseDto[]> {
    const request = await this.getRequestOrThrow(actor.tenantId, requestId);
    this.ensureCanViewAudit(actor, request);

    const logs = await this.approvalAuditRepository.findByTravelRequestInTenant(
      actor.tenantId,
      requestId,
    );

    return logs.map((log) => ApprovalAuditLogResponseDto.fromDocument(log));
  }

  async recordCancel(
    actor: AuthenticatedUser,
    request: TravelRequestDocument,
  ): Promise<void> {
    await this.recordAudit({
      tenantId: actor.tenantId,
      travelRequestId: request._id.toString(),
      actor,
      action: ApprovalAuditAction.CANCEL,
      step: null,
      comment: '',
      previousStatus: request.status,
      newStatus: TravelRequestStatus.CANCELLED,
    });
  }

  private ensureCanApprove(actor: AuthenticatedUser, request: TravelRequestDocument): void {
    if (request.status !== TravelRequestStatus.PENDING_APPROVAL) {
      throw new BusinessException(
        {
          code: ErrorCodes.APPROVAL_ALREADY_COMPLETED,
          message: 'This travel request is not pending approval',
          details: { status: request.status },
        },
        HttpStatus.CONFLICT,
      );
    }

    if (!this.approvalWorkflowService.canActorApproveStep(actor, request)) {
      throw new BusinessException(
        {
          code: ErrorCodes.APPROVAL_NOT_AUTHORIZED,
          message: 'You are not authorized to act on this approval step',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private ensureCanViewAudit(actor: AuthenticatedUser, request: TravelRequestDocument): void {
    const canReadAll = roleHasPermission(actor.role, Permission.TRAVEL_REQUESTS_READ_ALL);

    if (canReadAll) {
      return;
    }

    if (request.userId.toString() !== actor.userId) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_FORBIDDEN,
          message: 'You do not have access to this audit trail',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async getRequestOrThrow(
    tenantId: string,
    requestId: string,
  ): Promise<TravelRequestDocument> {
    const request = await this.travelRequestRepository.findByIdInTenant(tenantId, requestId);

    if (!request) {
      throw new BusinessException(
        {
          code: ErrorCodes.TRAVEL_REQUEST_NOT_FOUND,
          message: 'Travel request not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return request;
  }

  private async recordAudit(input: {
    tenantId: string;
    travelRequestId: string;
    actor: AuthenticatedUser;
    action: ApprovalAuditAction;
    step: number | null;
    comment: string;
    previousStatus: TravelRequestStatus;
    newStatus: TravelRequestStatus;
  }): Promise<void> {
    await this.approvalAuditRepository.create({
      tenantId: new Types.ObjectId(input.tenantId),
      travelRequestId: new Types.ObjectId(input.travelRequestId),
      actorId: new Types.ObjectId(input.actor.userId),
      actorRole: input.actor.role,
      action: input.action,
      step: input.step,
      comment: input.comment,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
    });
  }

  private cloneApprovalSteps(steps: ApprovalStep[]): ApprovalStep[] {
    return steps.map((step) => ({
      step: step.step,
      requiredRole: step.requiredRole,
      status: step.status,
      actedBy: step.actedBy,
      actedAt: step.actedAt,
      comment: step.comment,
    }));
  }

  private toResponse(request: TravelRequestDocument): TravelRequestResponseDto {
    const response = TravelRequestResponseDto.fromDocument(request);
    response.approvalSteps = request.approvalSteps.map((step) =>
      ApprovalStepResponseDto.fromStep(step),
    );
    response.currentStepIndex = request.currentStepIndex;
    response.approvedAt = request.approvedAt;
    response.rejectedAt = request.rejectedAt;
    response.rejectionComment = request.rejectionComment;
    return response;
  }
}
