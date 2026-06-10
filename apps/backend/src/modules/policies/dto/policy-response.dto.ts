import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { PerDiemPolicyDocument } from '../schemas/per-diem-policy.schema';

export class PolicyResponseDto {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  countryCode: string;
  role: UserRole | null;
  dailyRate: number;
  currency: string;
  status: PolicyStatus;
  priority: number;
  version: number;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromDocument(policy: PerDiemPolicyDocument): PolicyResponseDto {
    return {
      id: policy._id.toString(),
      tenantId: policy.tenantId.toString(),
      name: policy.name,
      description: policy.description,
      countryCode: policy.countryCode,
      role: policy.role,
      dailyRate: policy.dailyRate,
      currency: policy.currency,
      status: policy.status,
      priority: policy.priority,
      version: policy.version ?? 1,
      effectiveFrom: policy.effectiveFrom,
      effectiveTo: policy.effectiveTo,
      createdAt: policy.createdAt ?? new Date(),
      updatedAt: policy.updatedAt ?? new Date(),
    };
  }
}

export class PaginatedPoliciesResponseDto {
  items: PolicyResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PerDiemCalculationResponseDto {
  countryCode: string;
  role: UserRole;
  days: number;
  dailyRate: number;
  currency: string;
  totalAmount: number;
  policyId: string;
  policyName: string;
  appliedRole: UserRole | null;
  priority: number;
}
