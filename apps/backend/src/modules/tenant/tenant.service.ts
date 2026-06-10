import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '@/common/constants/error-codes';
import { TenantStatus } from '@/common/enums/tenant-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { TenantDocument } from './schemas/tenant.schema';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async createTenant(name: string, slug: string): Promise<TenantDocument> {
    const normalizedSlug = this.normalizeSlug(slug);

    if (await this.tenantRepository.existsBySlug(normalizedSlug)) {
      throw new BusinessException(
        {
          code: ErrorCodes.TENANT_SLUG_EXISTS,
          message: 'Tenant slug is already in use',
        },
        HttpStatus.CONFLICT,
      );
    }

    return this.tenantRepository.create({
      name: name.trim(),
      slug: normalizedSlug,
      status: TenantStatus.ACTIVE,
    });
  }

  async getBySlug(slug: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.findBySlug(slug);

    if (!tenant) {
      throw new BusinessException(
        {
          code: ErrorCodes.TENANT_NOT_FOUND,
          message: 'Tenant not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    this.ensureTenantActive(tenant);
    return tenant;
  }

  async getById(tenantId: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new BusinessException(
        {
          code: ErrorCodes.TENANT_NOT_FOUND,
          message: 'Tenant not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    this.ensureTenantActive(tenant);
    return tenant;
  }

  normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  generateSlugFromName(name: string): string {
    return this.normalizeSlug(name);
  }

  private ensureTenantActive(tenant: TenantDocument): void {
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new BusinessException(
        {
          code: ErrorCodes.TENANT_SUSPENDED,
          message: 'Tenant account is suspended',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
