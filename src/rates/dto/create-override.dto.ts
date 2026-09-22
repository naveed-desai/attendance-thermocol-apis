import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateDailyRateOverrideDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Rate must be a positive number' })
  rate8h: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
