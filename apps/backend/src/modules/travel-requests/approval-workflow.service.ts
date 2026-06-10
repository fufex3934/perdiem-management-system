import { Injectable } from '@nestjs/common';
import { ApprovalStepStatus } from '@/common/enums/approval-step-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ApprovalStep, TravelRequestDocument } from './schemas/travel-request.schema';

@Injectable()
export class ApprovalWorkflowService {
  buildApprovalSteps(requesterRole: UserRole): ApprovalStep[] {
    switch (requesterRole) {
      case UserRole.EMPLOYEE:
        return [
          this.createStep(1, UserRole.MANAGER),
          this.createStep(2, UserRole.TENANT_ADMIN),
        ];
      case UserRole.MANAGER:
        return [this.createStep(1, UserRole.TENANT_ADMIN)];
      case UserRole.TENANT_ADMIN:
        return [];
      default:
        return [];
    }
  }

  getCurrentStep(request: TravelRequestDocument): ApprovalStep | null {
    if (
      request.currentStepIndex < 0 ||
      request.currentStepIndex >= request.approvalSteps.length
    ) {
      return null;
    }

    return request.approvalSteps[request.currentStepIndex];
  }

  canActorApproveStep(actor: AuthenticatedUser, request: TravelRequestDocument): boolean {
    if (request.userId.toString() === actor.userId) {
      return false;
    }

    const currentStep = this.getCurrentStep(request);
    if (!currentStep || currentStep.status !== ApprovalStepStatus.PENDING) {
      return false;
    }

    return (
      actor.role === currentStep.requiredRole || actor.role === UserRole.TENANT_ADMIN
    );
  }

  isWorkflowComplete(request: TravelRequestDocument): boolean {
    if (request.approvalSteps.length === 0) {
      return true;
    }

    return request.approvalSteps.every(
      (step) => step.status === ApprovalStepStatus.APPROVED,
    );
  }

  private createStep(step: number, requiredRole: UserRole): ApprovalStep {
    return {
      step,
      requiredRole,
      status: ApprovalStepStatus.PENDING,
      actedBy: null,
      actedAt: null,
      comment: '',
    };
  }
}
