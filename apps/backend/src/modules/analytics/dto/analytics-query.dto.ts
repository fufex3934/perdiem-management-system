import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsDateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
