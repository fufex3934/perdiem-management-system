import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
