import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCodes } from '@/common/constants/error-codes';
import { TenantStatus } from '@/common/enums/tenant-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { TenantRepository } from './tenant.repository';
import { TenantService } from './tenant.service';

describe('TenantService', () => {
  let service: TenantService;
  let repository: jest.Mocked<TenantRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: TenantRepository,
          useValue: {
            create: jest.fn(),
            findBySlug: jest.fn(),
            findById: jest.fn(),
            existsBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TenantService);
    repository = module.get(TenantRepository);
  });

  it('should normalize slug', () => {
    expect(service.normalizeSlug('  Acme Corp!!  ')).toBe('acme-corp');
  });

  it('should create tenant when slug is available', async () => {
    repository.existsBySlug.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      _id: 'tenant-id',
      name: 'Acme',
      slug: 'acme',
      status: TenantStatus.ACTIVE,
    } as never);

    const result = await service.createTenant('Acme', 'acme');

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Acme',
      slug: 'acme',
      status: TenantStatus.ACTIVE,
    });
    expect(result.slug).toBe('acme');
  });

  it('should throw when slug exists', async () => {
    repository.existsBySlug.mockResolvedValue(true);

    await expect(service.createTenant('Acme', 'acme')).rejects.toMatchObject({
      response: { code: ErrorCodes.TENANT_SLUG_EXISTS },
    });
  });

  it('should throw when tenant is suspended', async () => {
    repository.findBySlug.mockResolvedValue({
      _id: 'tenant-id',
      slug: 'acme',
      status: TenantStatus.SUSPENDED,
    } as never);

    await expect(service.getBySlug('acme')).rejects.toThrow(BusinessException);
    await expect(service.getBySlug('acme')).rejects.toMatchObject({
      getStatus: expect.any(Function),
    });

    try {
      await service.getBySlug('acme');
    } catch (error) {
      expect((error as BusinessException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });
});
