import { UserRole } from '@/common/enums/user-role.enum';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: jest.Mocked<AnalyticsRepository>;

  const tenantId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';

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

  beforeEach(() => {
    repository = {
      countTravelRequests: jest.fn(),
      countPendingApprovals: jest.fn(),
      aggregateTravelByStatus: jest.fn(),
      aggregateTravelByCountry: jest.fn(),
      sumTravelPerDiem: jest.fn(),
      countPayments: jest.fn(),
      aggregatePaymentsByStatus: jest.fn(),
      sumPaymentsByStatus: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsRepository>;

    service = new AnalyticsService(repository);
  });

  it('returns tenant-scoped dashboard for admin', async () => {
    repository.countTravelRequests.mockResolvedValue(5);
    repository.countPendingApprovals.mockResolvedValue(2);
    repository.aggregateTravelByStatus.mockResolvedValue([
      { _id: 'approved', count: 3, totalAmount: 600 },
    ]);
    repository.aggregateTravelByCountry.mockResolvedValue([
      { _id: 'US', count: 3, totalAmount: 600 },
    ]);
    repository.sumTravelPerDiem.mockResolvedValue(600);
    repository.countPayments.mockResolvedValue(2);
    repository.aggregatePaymentsByStatus.mockResolvedValue([
      { _id: 'paid', count: 1, totalAmount: 200 },
      { _id: 'pending', count: 1, totalAmount: 400 },
    ]);
    repository.sumPaymentsByStatus.mockImplementation(async (_filter, status) =>
      status === 'paid' ? 200 : 400,
    );

    const result = await service.getDashboard(admin);

    expect(result.scope).toBe('tenant');
    expect(repository.countTravelRequests).toHaveBeenCalledWith({
      tenantId,
      userId: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
    expect(result.travelRequests.total).toBe(5);
    expect(result.payments.totalPaid).toBe(200);
    expect(result.pendingApprovals).toBe(2);
  });

  it('returns own-scoped dashboard for employee', async () => {
    repository.countTravelRequests.mockResolvedValue(1);
    repository.countPendingApprovals.mockResolvedValue(0);
    repository.aggregateTravelByStatus.mockResolvedValue([]);
    repository.aggregateTravelByCountry.mockResolvedValue([]);
    repository.sumTravelPerDiem.mockResolvedValue(0);
    repository.countPayments.mockResolvedValue(0);
    repository.aggregatePaymentsByStatus.mockResolvedValue([]);
    repository.sumPaymentsByStatus.mockResolvedValue(0);

    const result = await service.getDashboard(employee);

    expect(result.scope).toBe('own');
    expect(repository.countTravelRequests).toHaveBeenCalledWith({
      tenantId,
      userId,
      fromDate: undefined,
      toDate: undefined,
    });
  });

  it('builds spend report with date range', async () => {
    repository.countTravelRequests.mockResolvedValue(2);
    repository.sumTravelPerDiem.mockResolvedValue(500);
    repository.aggregateTravelByStatus.mockResolvedValue([
      { _id: 'approved', count: 2, totalAmount: 500 },
    ]);
    repository.aggregateTravelByCountry.mockResolvedValue([
      { _id: 'DE', count: 2, totalAmount: 500 },
    ]);
    repository.sumPaymentsByStatus.mockResolvedValue(0);

    const result = await service.getSpendReport(admin, {
      fromDate: '2026-01-01',
      toDate: '2026-06-30',
    });

    expect(result.fromDate).toBe('2026-01-01');
    expect(result.toDate).toBe('2026-06-30');
    expect(result.totalPerDiemAmount).toBe(500);
    expect(repository.countTravelRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        fromDate: new Date('2026-01-01'),
      }),
    );
  });

  it('exports spend report as CSV', async () => {
    repository.countTravelRequests.mockResolvedValue(1);
    repository.sumTravelPerDiem.mockResolvedValue(240);
    repository.aggregateTravelByStatus.mockResolvedValue([
      { _id: 'approved', count: 1, totalAmount: 240 },
    ]);
    repository.aggregateTravelByCountry.mockResolvedValue([
      { _id: 'US', count: 1, totalAmount: 240 },
    ]);
    repository.sumPaymentsByStatus.mockResolvedValue(0);

    const result = await service.exportSpendReport(employee, {});

    expect(result.filename).toMatch(/^spend-report-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain('country_code,request_count,total_per_diem_amount');
    expect(result.csv).toContain('US,1,240');
    expect(result.rowCount).toBe(1);
  });
});
