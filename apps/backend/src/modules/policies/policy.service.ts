import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ErrorCodes } from '@/common/constants/error-codes';
import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { ListPoliciesQueryDto } from './dto/list-policies-query.dto';
import {
  PaginatedPoliciesResponseDto,
  PolicyResponseDto,
} from './dto/policy-response.dto';
import { PolicyVersionResponseDto } from './dto/policy-version-response.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyVersionRepository } from './policy-version.repository';
import { PolicyRepository } from './policy.repository';
import { PerDiemPolicyDocument } from './schemas/per-diem-policy.schema';

@Injectable()
export class PolicyService {
  constructor(
    private readonly policyRepository: PolicyRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
  ) {}

  async create(tenantId: string, dto: CreatePolicyDto): Promise<PolicyResponseDto> {
    this.validateEffectiveDates(dto.effectiveFrom, dto.effectiveTo);

    const countryCode = dto.countryCode.toUpperCase();
    const currency = dto.currency.toUpperCase();
    const role = dto.role ?? null;

    const isDuplicate = await this.policyRepository.existsDuplicateInTenant(
      tenantId,
      countryCode,
      role,
      dto.name,
    );

    if (isDuplicate) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_CONFLICT,
          message: 'A policy with this name already exists for the country and role',
        },
        HttpStatus.CONFLICT,
      );
    }

    const policy = await this.policyRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      countryCode,
      role,
      dailyRate: dto.dailyRate,
      currency,
      status: dto.status ?? PolicyStatus.ACTIVE,
      priority: dto.priority ?? 0,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });

    return PolicyResponseDto.fromDocument(policy);
  }

  async list(
    tenantId: string,
    query: ListPoliciesQueryDto,
  ): Promise<PaginatedPoliciesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.policyRepository.findAllInTenant(
      tenantId,
      {
        countryCode: query.countryCode?.toUpperCase(),
        role: query.role,
        status: query.status,
      },
      page,
      limit,
    );

    return {
      items: items.map((policy) => PolicyResponseDto.fromDocument(policy)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(tenantId: string, policyId: string): Promise<PolicyResponseDto> {
    const policy = await this.policyRepository.findByIdInTenant(tenantId, policyId);

    if (!policy) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_NOT_FOUND,
          message: 'Policy not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return PolicyResponseDto.fromDocument(policy);
  }

  async listVersions(
    tenantId: string,
    policyId: string,
  ): Promise<PolicyVersionResponseDto[]> {
    const policy = await this.policyRepository.findByIdInTenant(tenantId, policyId);
    if (!policy) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_NOT_FOUND,
          message: 'Policy not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const versions = await this.policyVersionRepository.findByPolicyInTenant(
      tenantId,
      policyId,
    );
    return versions.map((v) => PolicyVersionResponseDto.fromDocument(v));
  }

  async update(
    tenantId: string,
    policyId: string,
    dto: UpdatePolicyDto,
    actor?: AuthenticatedUser,
  ): Promise<PolicyResponseDto> {
    const existing = await this.policyRepository.findByIdInTenant(tenantId, policyId);

    if (!existing) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_NOT_FOUND,
          message: 'Policy not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom?.toISOString();
    const effectiveTo = dto.effectiveTo ?? existing.effectiveTo?.toISOString();
    this.validateEffectiveDates(effectiveFrom, effectiveTo);

    const nextName = dto.name?.trim() ?? existing.name;
    const nextCountry = (dto.countryCode ?? existing.countryCode).toUpperCase();
    const nextRole = dto.role !== undefined ? dto.role : existing.role;

    const isDuplicate = await this.policyRepository.existsDuplicateInTenant(
      tenantId,
      nextCountry,
      nextRole,
      nextName,
      policyId,
    );

    if (isDuplicate) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_CONFLICT,
          message: 'A policy with this name already exists for the country and role',
        },
        HttpStatus.CONFLICT,
      );
    }

    const update: Record<string, unknown> = { ...dto };

    if (dto.countryCode) {
      update.countryCode = nextCountry;
    }

    if (dto.currency) {
      update.currency = dto.currency.toUpperCase();
    }

    if (dto.effectiveFrom) {
      update.effectiveFrom = new Date(dto.effectiveFrom);
    }

    if (dto.effectiveTo) {
      update.effectiveTo = new Date(dto.effectiveTo);
    }

    if (dto.name) {
      update.name = nextName;
    }

    if (actor) {
      await this.policyVersionRepository.create({
        tenantId: new Types.ObjectId(tenantId),
        policyId: existing._id,
        version: existing.version ?? 1,
        snapshot: this.toSnapshot(existing),
        changedBy: new Types.ObjectId(actor.userId),
        changedByEmail: actor.email,
      });
      update.version = (existing.version ?? 1) + 1;
    }

    const updated = await this.policyRepository.updateInTenant(tenantId, policyId, update);

    return PolicyResponseDto.fromDocument(updated!);
  }

  private toSnapshot(policy: PerDiemPolicyDocument) {
    return {
      name: policy.name,
      description: policy.description,
      countryCode: policy.countryCode,
      role: policy.role,
      dailyRate: policy.dailyRate,
      currency: policy.currency,
      status: policy.status,
      priority: policy.priority,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
    };
  }

  async delete(tenantId: string, policyId: string): Promise<{ message: string }> {
    const deleted = await this.policyRepository.softDeleteInTenant(tenantId, policyId);

    if (!deleted) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_NOT_FOUND,
          message: 'Policy not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: 'Policy deleted successfully' };
  }

  private validateEffectiveDates(
    effectiveFrom?: string | null,
    effectiveTo?: string | null,
  ): void {
    if (!effectiveFrom || !effectiveTo) {
      return;
    }

    const from = new Date(effectiveFrom);
    const to = new Date(effectiveTo);

    if (from > to) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_POLICY_DATES,
          message: 'effectiveFrom must be before effectiveTo',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
