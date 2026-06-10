import { Types } from 'mongoose';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { TravelRequestStatus } from '@/common/enums/travel-request-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { TravelRequestDocument } from '../travel-requests/schemas/travel-request.schema';
import { NotificationPublisher } from '../notifications/notification.publisher';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PerDiemPaymentDocument } from './schemas/per-diem-payment.schema';

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: jest.Mocked<PaymentRepository>;
  let notificationPublisher: jest.Mocked<NotificationPublisher>;

  const tenantId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const requestId = '507f1f77bcf86cd799439014';
  const paymentId = '507f1f77bcf86cd799439016';

  const admin = {
    userId: '507f1f77bcf86cd799439099',
    tenantId,
    email: 'admin@example.com',
    role: UserRole.TENANT_ADMIN,
  };

  const employee = {
    userId,
    tenantId,
    email: 'employee@example.com',
    role: UserRole.EMPLOYEE,
  };

  const approvedRequest = {
    _id: new Types.ObjectId(requestId),
    tenantId: new Types.ObjectId(tenantId),
    userId: new Types.ObjectId(userId),
    title: 'Conference',
    destinationCountryCode: 'US',
    days: 3,
    policyName: 'US Employee',
    totalAmount: 270,
    currency: 'USD',
    status: TravelRequestStatus.APPROVED,
  } as TravelRequestDocument;

  const basePayment = (overrides: Partial<PerDiemPaymentDocument> = {}) =>
    ({
      _id: new Types.ObjectId(paymentId),
      tenantId: new Types.ObjectId(tenantId),
      travelRequestId: new Types.ObjectId(requestId),
      userId: new Types.ObjectId(userId),
      travelTitle: 'Conference',
      destinationCountryCode: 'US',
      days: 3,
      policyName: 'US Employee',
      amount: 270,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      paymentReference: '',
      notes: '',
      processedBy: null,
      paidAt: null,
      createdAt: new Date('2026-06-01'),
      updatedAt: new Date('2026-06-01'),
      ...overrides,
    }) as PerDiemPaymentDocument;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByIdInTenant: jest.fn(),
      findByTravelRequestInTenant: jest.fn(),
      findAllInTenant: jest.fn(),
      findAllForExport: jest.fn(),
      updateInTenant: jest.fn(),
    } as unknown as jest.Mocked<PaymentRepository>;

    notificationPublisher = {
      travelRequestSubmitted: jest.fn(),
      travelRequestStepApproved: jest.fn(),
      travelRequestApproved: jest.fn(),
      travelRequestRejected: jest.fn(),
      paymentCreated: jest.fn(),
      paymentPaid: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationPublisher>;

    service = new PaymentService(repository, notificationPublisher);
  });

  it('should create payment from approved travel request', async () => {
    repository.findByTravelRequestInTenant.mockResolvedValue(null);
    repository.create.mockResolvedValue(basePayment());

    const result = await service.createFromApprovedTravelRequest(tenantId, approvedRequest);

    expect(result?.amount).toBe(270);
    expect(result?.status).toBe(PaymentStatus.PENDING);
    expect(repository.create).toHaveBeenCalled();
  });

  it('should return existing payment if already created', async () => {
    repository.findByTravelRequestInTenant.mockResolvedValue(basePayment());

    const result = await service.createFromApprovedTravelRequest(tenantId, approvedRequest);

    expect(result?.id).toBe(paymentId);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should mark pending payment as paid', async () => {
    repository.findByIdInTenant.mockResolvedValue(basePayment());
    repository.updateInTenant.mockResolvedValue(
      basePayment({
        status: PaymentStatus.PAID,
        paidAt: new Date('2026-06-02'),
        processedBy: new Types.ObjectId(admin.userId),
        paymentReference: 'REF-001',
      }),
    );

    const result = await service.markPaid(admin, paymentId, {
      paymentReference: 'REF-001',
    });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(result.paymentReference).toBe('REF-001');
  });

  it('should forbid employee from viewing another users payment', async () => {
    repository.findByIdInTenant.mockResolvedValue(
      basePayment({
        userId: new Types.ObjectId('507f1f77bcf86cd799439099'),
      }),
    );

    await expect(service.getById(employee, paymentId)).rejects.toMatchObject({
      response: { code: 'PAYMENT_FORBIDDEN' },
    });
  });

  it('should export payments as CSV', async () => {
    repository.findAllForExport.mockResolvedValue([basePayment()]);

    const result = await service.exportCsv(admin, {});

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain('payment_id');
    expect(result.csv).toContain('Conference');
    expect(result.filename).toContain('per-diem-payments');
  });
});
