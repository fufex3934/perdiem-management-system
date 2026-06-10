import { Types } from 'mongoose';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { PolicyCalculationService } from '../policies/policy-calculation.service';
import { ApprovalService } from './approval.service';
import { TravelRequestResponseDto } from './dto/travel-request-response.dto';
import { TravelRequestDocument } from './schemas/travel-request.schema';
import { TravelRequestRepository } from './travel-request.repository';
import { TravelRequestService } from './travel-request.service';

describe('TravelRequestService', () => {
  let service: TravelRequestService;
  let repository: jest.Mocked<TravelRequestRepository>;
  let policyCalculationService: jest.Mocked<PolicyCalculationService>;
  let approvalService: jest.Mocked<ApprovalService>;

  const tenantId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const policyId = '507f1f77bcf86cd799439013';
  const requestId = '507f1f77bcf86cd799439014';

  const actor = {
    userId,
    tenantId,
    email: 'user@example.com',
    role: UserRole.EMPLOYEE,
  };

  const baseRequest = (overrides: Partial<TravelRequestDocument> = {}) =>
    ({
      _id: new Types.ObjectId(requestId),
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(userId),
      requesterRole: UserRole.EMPLOYEE,
      title: 'Client visit',
      purpose: 'Meeting',
      destinationCountryCode: 'US',
      destinationCity: 'NYC',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-05'),
      days: 5,
      policyId: new Types.ObjectId(policyId),
      policyName: 'US Employee',
      dailyRate: 85,
      currency: 'USD',
      totalAmount: 425,
      appliedPolicyRole: UserRole.EMPLOYEE,
      status: TravelRequestStatus.DRAFT,
      submittedAt: null,
      cancelledAt: null,
      approvalSteps: [],
      currentStepIndex: -1,
      approvedAt: null,
      rejectedAt: null,
      rejectionComment: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as TravelRequestDocument;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByIdInTenant: jest.fn(),
      findAllInTenant: jest.fn(),
      updateInTenant: jest.fn(),
    } as unknown as jest.Mocked<TravelRequestRepository>;

    policyCalculationService = {
      calculate: jest.fn(),
    } as unknown as jest.Mocked<PolicyCalculationService>;

    approvalService = {
      processSubmit: jest.fn(),
      recordCancel: jest.fn(),
    } as unknown as jest.Mocked<ApprovalService>;

    service = new TravelRequestService(
      repository,
      policyCalculationService,
      approvalService,
    );
  });

  it('should calculate inclusive travel days', () => {
    expect(
      service.calculateDays(new Date('2026-06-01'), new Date('2026-06-05')),
    ).toBe(5);
    expect(
      service.calculateDays(new Date('2026-06-01'), new Date('2026-06-01')),
    ).toBe(1);
  });

  it('should create a draft travel request with auto-calculated per diem', async () => {
    policyCalculationService.calculate.mockResolvedValue({
      countryCode: 'US',
      role: UserRole.EMPLOYEE,
      days: 3,
      dailyRate: 85,
      currency: 'USD',
      totalAmount: 255,
      policyId,
      policyName: 'US Employee',
      appliedRole: UserRole.EMPLOYEE,
      priority: 10,
    });

    repository.create.mockResolvedValue(
      baseRequest({
        days: 3,
        totalAmount: 255,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-12'),
      }),
    );

    const result = await service.create(actor, {
      title: 'Conference',
      destinationCountryCode: 'US',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
    });

    expect(policyCalculationService.calculate).toHaveBeenCalledWith(tenantId, {
      countryCode: 'US',
      role: UserRole.EMPLOYEE,
      days: 3,
      startDate: '2026-06-10',
    });
    expect(result.status).toBe(TravelRequestStatus.DRAFT);
    expect(result.totalAmount).toBe(255);
  });

  it('should reject invalid date ranges', async () => {
    await expect(
      service.create(actor, {
        title: 'Invalid trip',
        destinationCountryCode: 'US',
        startDate: '2026-06-10',
        endDate: '2026-06-01',
      }),
    ).rejects.toMatchObject({
      response: { code: 'TRAVEL_REQUEST_INVALID_DATES' },
    });
  });

  it('should submit a draft travel request via approval workflow', async () => {
    repository.findByIdInTenant.mockResolvedValue(baseRequest());
    approvalService.processSubmit.mockResolvedValue({
      id: requestId,
      status: TravelRequestStatus.PENDING_APPROVAL,
      submittedAt: new Date('2026-06-10'),
    } as TravelRequestResponseDto);

    const result = await service.submit(actor, requestId);

    expect(approvalService.processSubmit).toHaveBeenCalled();
    expect(result.status).toBe(TravelRequestStatus.PENDING_APPROVAL);
  });

  it('should forbid employees from accessing other users requests', async () => {
    repository.findByIdInTenant.mockResolvedValue(
      baseRequest({
        userId: new Types.ObjectId('507f1f77bcf86cd799439099'),
      }),
    );

    await expect(service.getById(actor, requestId)).rejects.toMatchObject({
      response: { code: 'TRAVEL_REQUEST_FORBIDDEN' },
    });
  });

  it('should allow managers to read all tenant requests', async () => {
    repository.findByIdInTenant.mockResolvedValue(
      baseRequest({
        userId: new Types.ObjectId('507f1f77bcf86cd799439099'),
      }),
    );

    const manager = { ...actor, role: UserRole.MANAGER };
    const result = await service.getById(manager, requestId);

    expect(result.id).toBe(requestId);
  });
});
