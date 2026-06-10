import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let repository: jest.Mocked<SecurityAuditRepository>;

  const tenantId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue({}),
      findAllInTenant: jest.fn(),
    } as unknown as jest.Mocked<SecurityAuditRepository>;

    service = new SecurityAuditService(repository);
  });

  it('records audit log without blocking on persistence errors', async () => {
    repository.create.mockRejectedValue(new Error('db down'));

    service.record({
      tenantId,
      action: SecurityAuditAction.AUTH_LOGIN_SUCCESS,
      success: true,
      httpContext: {
        ip: '127.0.0.1',
        userAgent: 'jest',
        requestId: 'req-1',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(repository.create).toHaveBeenCalled();
  });

  it('lists tenant audit logs with pagination', async () => {
    repository.findAllInTenant.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await service.listAuditLogs(tenantId, { page: 1, limit: 10 });

    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(repository.findAllInTenant).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({}),
      1,
      10,
    );
  });
});
