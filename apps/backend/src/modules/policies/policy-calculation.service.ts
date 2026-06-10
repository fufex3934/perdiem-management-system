import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '@/common/constants/error-codes';
import { UserRole } from '@/common/enums/user-role.enum';
import { BusinessException } from '@/common/exceptions/business.exception';
import { CalculatePerDiemDto } from './dto/calculate-per-diem.dto';
import { PerDiemCalculationResponseDto } from './dto/policy-response.dto';
import { PolicyRepository } from './policy.repository';
import { PerDiemPolicyDocument } from './schemas/per-diem-policy.schema';

@Injectable()
export class PolicyCalculationService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async calculate(
    tenantId: string,
    dto: CalculatePerDiemDto,
  ): Promise<PerDiemCalculationResponseDto> {
    const countryCode = dto.countryCode.toUpperCase();
    const referenceDate = dto.startDate ? new Date(dto.startDate) : new Date();

    if (Number.isNaN(referenceDate.getTime())) {
      throw new BusinessException(
        {
          code: ErrorCodes.INVALID_CALCULATION_INPUT,
          message: 'Invalid start date',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const candidates = await this.policyRepository.findMatchingPolicies(
      tenantId,
      countryCode,
      dto.role,
      referenceDate,
    );

    const policy = this.selectBestPolicy(candidates, dto.role);

    if (!policy) {
      throw new BusinessException(
        {
          code: ErrorCodes.POLICY_RULE_NOT_FOUND,
          message: `No active per diem policy found for ${countryCode} and role ${dto.role}`,
          details: { countryCode, role: dto.role, days: dto.days },
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const totalAmount = this.roundCurrency(policy.dailyRate * dto.days);

    return {
      countryCode,
      role: dto.role,
      days: dto.days,
      dailyRate: policy.dailyRate,
      currency: policy.currency,
      totalAmount,
      policyId: policy._id.toString(),
      policyName: policy.name,
      appliedRole: policy.role,
      priority: policy.priority,
    };
  }

  selectBestPolicy(
    policies: PerDiemPolicyDocument[],
    role: UserRole,
  ): PerDiemPolicyDocument | null {
    if (policies.length === 0) {
      return null;
    }

    const roleSpecific = policies.filter((policy) => policy.role === role);
    const pool = roleSpecific.length > 0 ? roleSpecific : policies.filter((p) => p.role === null);

    if (pool.length === 0) {
      return null;
    }

    return pool.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.updatedAt!.getTime() - a.updatedAt!.getTime();
    })[0];
  }

  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
