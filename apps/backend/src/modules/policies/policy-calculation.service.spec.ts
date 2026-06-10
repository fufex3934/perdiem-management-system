import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { PolicyCalculationService } from './policy-calculation.service';
import { PolicyRepository } from './policy.repository';
import { PerDiemPolicyDocument } from './schemas/per-diem-policy.schema';

describe('PolicyCalculationService', () => {
  let service: PolicyCalculationService;
  let repository: jest.Mocked<PolicyRepository>;

  const basePolicy = (overrides: Partial<PerDiemPolicyDocument> = {}) =>
    ({
      _id: 'policy-id',
      name: 'US Employee',
      countryCode: 'US',
      role: UserRole.EMPLOYEE,
      dailyRate: 100,
      currency: 'USD',
      status: PolicyStatus.ACTIVE,
      priority: 10,
      effectiveFrom: null,
      effectiveTo: null,
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    }) as PerDiemPolicyDocument;

  beforeEach(() => {
    repository = {
      findMatchingPolicies: jest.fn(),
    } as unknown as jest.Mocked<PolicyRepository>;

    service = new PolicyCalculationService(repository);
  });

  it('should prefer role-specific policy over generic policy', () => {
    const selected = service.selectBestPolicy(
      [
        basePolicy({ role: null, priority: 100, name: 'US Default' }),
        basePolicy({ role: UserRole.EMPLOYEE, priority: 5, name: 'US Employee' }),
      ],
      UserRole.EMPLOYEE,
    );

    expect(selected?.name).toBe('US Employee');
  });

  it('should use highest priority when multiple policies match', () => {
    const selected = service.selectBestPolicy(
      [
        basePolicy({ role: UserRole.MANAGER, priority: 5, name: 'Low' }),
        basePolicy({ role: UserRole.MANAGER, priority: 20, name: 'High' }),
      ],
      UserRole.MANAGER,
    );

    expect(selected?.name).toBe('High');
  });

  it('should calculate total amount', async () => {
    repository.findMatchingPolicies.mockResolvedValue([
      basePolicy({ dailyRate: 75.5 }),
    ]);

    const result = await service.calculate('tenant-id', {
      countryCode: 'US',
      role: UserRole.EMPLOYEE,
      days: 4,
    });

    expect(result.totalAmount).toBe(302);
    expect(result.dailyRate).toBe(75.5);
    expect(result.currency).toBe('USD');
  });

  it('should throw when no policy matches', async () => {
    repository.findMatchingPolicies.mockResolvedValue([]);

    await expect(
      service.calculate('tenant-id', {
        countryCode: 'US',
        role: UserRole.EMPLOYEE,
        days: 2,
      }),
    ).rejects.toMatchObject({
      response: { code: 'POLICY_RULE_NOT_FOUND' },
    });
  });
});
