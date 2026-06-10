import { ApprovalStepStatus } from '@/common/enums/approval-step-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { TravelRequestDocument } from './schemas/travel-request.schema';

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;

  beforeEach(() => {
    service = new ApprovalWorkflowService();
  });

  it('should build two-step workflow for employee requests', () => {
    const steps = service.buildApprovalSteps(UserRole.EMPLOYEE);

    expect(steps).toHaveLength(2);
    expect(steps[0].requiredRole).toBe(UserRole.MANAGER);
    expect(steps[1].requiredRole).toBe(UserRole.TENANT_ADMIN);
  });

  it('should build single-step workflow for manager requests', () => {
    const steps = service.buildApprovalSteps(UserRole.MANAGER);

    expect(steps).toHaveLength(1);
    expect(steps[0].requiredRole).toBe(UserRole.TENANT_ADMIN);
  });

  it('should auto-approve tenant admin requests with no steps', () => {
    const steps = service.buildApprovalSteps(UserRole.TENANT_ADMIN);
    expect(steps).toHaveLength(0);
  });

  it('should allow manager to approve employee step 1', () => {
    const request = {
      userId: { toString: () => 'employee-id' },
      currentStepIndex: 0,
      approvalSteps: [
        {
          step: 1,
          requiredRole: UserRole.MANAGER,
          status: ApprovalStepStatus.PENDING,
        },
      ],
    } as TravelRequestDocument;

    expect(
      service.canActorApproveStep(
        {
          userId: 'manager-id',
          tenantId: 'tenant-id',
          email: 'm@example.com',
          role: UserRole.MANAGER,
        },
        request,
      ),
    ).toBe(true);
  });

  it('should not allow self-approval', () => {
    const request = {
      userId: { toString: () => 'manager-id' },
      currentStepIndex: 0,
      approvalSteps: [
        {
          step: 1,
          requiredRole: UserRole.TENANT_ADMIN,
          status: ApprovalStepStatus.PENDING,
        },
      ],
    } as TravelRequestDocument;

    expect(
      service.canActorApproveStep(
        {
          userId: 'manager-id',
          tenantId: 'tenant-id',
          email: 'm@example.com',
          role: UserRole.MANAGER,
        },
        request,
      ),
    ).toBe(false);
  });
});
