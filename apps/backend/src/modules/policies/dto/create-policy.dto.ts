import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PolicyStatus } from '@/common/enums/policy-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export class CreatePolicyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/i, { message: 'countryCode must be a 2-letter ISO code' })
  countryCode: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dailyRate: number;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/i, { message: 'currency must be a 3-letter ISO code' })
  currency: string;

  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
