import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SecurityAuditAction } from '@/common/enums/security-audit-action.enum';

export class ListSecurityAuditQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(SecurityAuditAction)
  action?: SecurityAuditAction;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
