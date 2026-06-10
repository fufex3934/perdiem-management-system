import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTravelRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purpose?: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/i, { message: 'destinationCountryCode must be a 2-letter ISO code' })
  destinationCountryCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  destinationCity?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
