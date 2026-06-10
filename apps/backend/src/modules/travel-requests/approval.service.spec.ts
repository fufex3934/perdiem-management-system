import { Types } from 'mongoose';
import { ApprovalStepStatus } from '@/common/enums/approval-step-status.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { PaymentService } from '../finance/payment.service';
import { NotificationPublisher } from '../notifications/notification.publisher';
import { ApprovalAuditRepository } from './approval-audit.repository';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalService } from './approval.service';
import { TravelRequestDocument } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let repository: jest.Mocked<TravelRequestRepository>;
  let auditRepository: jest.Mocked<ApprovalAuditRepository>;
  let paymentService: jest.Mocked<PaymentService>;
  let notificationPublisher: jest.Mocked<NotificationPublisher>;

  const tenantId = '507f1f77bcf86cd799439011';
  const employeeId = '507f1f77bcf86cd799439012';
  const managerId = '507f1f77bcf86cd799439013';
  const requestId = '507f1f77bcf86cd799439014';

  const manager = {
    userId: managerId,
    tenantId,
    email: 'manager@example.com',
    role: UserRole.MANAGER,
  };

  const baseRequest = (overrides: Partial<TravelRequestDocument> = {}) =>
    ({
      _id: new Types.ObjectId(requestId),
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(employeeId),
      requesterRole: UserRole.EMPLOYEE,
      title: 'Trip',
      purpose: '',
      destinationCountryCode: 'US',
      destinationCity: '',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-03'),
      days: 3,
      policyId: new Types.ObjectId('507f1f77bcf86cd799439015'),
      policyName: 'US Employee',
      dailyRate: 90,
      currency: 'USD',
      totalAmount: 270,
      appliedPolicyRole: UserRole.EMPLOYEE,
      status: TravelRequestStatus.PENDING_APPROVAL,
      submittedAt: new Date(),
      cancelledAt: null,
      approvalSteps: [
        {
          step: 1,
          requiredRole: UserRole.MANAGER,
          status: ApprovalStepStatus.PENDING,
          actedBy: null,
          actedAt: null,
          comment: '',
        },
        {
          step: 2,
          requiredRole: UserRole.TENANT_ADMIN,
          status: ApprovalStepStatus.PENDING,
          actedBy: null,
          actedAt: null,
          comment: '',
        },
      ],
      currentStepIndex: 0,
      approvedAt: null,
      rejectedAt: null,
      rejectionComment: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as TravelRequestDocument;

  beforeEach(() => {
    repository = {
      findByIdInTenant: jest.fn(),
      updateInTenant: jest.fn(),
      findAllInTenant: jest.fn(),
    } as unknown as jest.Mocked<TravelRequestRepository>;

    auditRepository = {
      create: jest.fn().mockResolvedValue({}),
      findByTravelRequestInTenant: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ApprovalAuditRepository>;

    paymentService = {
      createFromApprovedTravelRequest: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<PaymentService>;

    notificationPublisher = {
      travelRequestSubmitted: jest.fn().mockResolvedValue(undefined),
      travelRequestStepApproved: jest.fn().mockResolvedValue(undefined),
      travelRequestApproved: jest.fn().mockResolvedValue(undefined),
      travelRequestRejected: jest.fn().mockResolvedValue(undefined),
      paymentCreated: jest.fn().mockResolvedValue(undefined),
      paymentPaid: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationPublisher>;

    service = new ApprovalService(
      repository,
      auditRepository,
      new ApprovalWorkflowService(),
      paymentService,
      notificationPublisher,
    );
  });

  it('should advance to next step on manager approval', async () => {
    repository.findByIdInTenant.mockResolvedValue(baseRequest());
    repository.updateInTenant.mockResolvedValue(
      baseRequest({
        currentStepIndex: 1,
        approvalSteps: [
          {
            step: 1,
            requiredRole: UserRole.MANAGER,
            status: ApprovalStepStatus.APPROVED,
            actedBy: new Types.ObjectId(managerId),
            actedAt: new Date(),
            comment: 'Looks good',
          },
          {
            step: 2,
            requiredRole: UserRole.TENANT_ADMIN,
            status: ApprovalStepStatus.PENDING,
            actedBy: null,
            actedAt: null,
            comment: '',
          },
        ],
      }),
    );

    const result = await service.approve(manager, requestId, { comment: 'Looks good' });

    expect(result.status).toBe(TravelRequestStatus.PENDING_APPROVAL);
    expect(result.currentStepIndex).toBe(1);
    expect(auditRepository.create).toHaveBeenCalled();
  });

  it('should reject request and stop workflow', async () => {
    repository.findByIdInTenant.mockResolvedValue(baseRequest());
    repository.updateInTenant.mockResolvedValue(
      baseRequest({
        status: TravelRequestStatus.REJECTED,
        currentStepIndex: -1,
        rejectedAt: new Date(),
        rejectionComment: 'Budget exceeded',
      }),
    );

    const result = await service.reject(manager, requestId, { comment: 'Budget exceeded' });

    expect(result.status).toBe(TravelRequestStatus.REJECTED);
    expect(result.rejectionComment).toBe('Budget exceeded');
  });
});
