import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { UserRole } from '@/common/enums/user-role.enum';

export class CalculatePerDiemDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/i, { message: 'countryCode must be a 2-letter ISO code' })
  countryCode: string;

  @IsEnum(UserRole)
  role: UserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
