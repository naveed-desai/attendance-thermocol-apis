import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(([01]\d|2[0-3]):([0-5]\d)|(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM|am|pm))$/,
    {
      message:
        'startTime must be in 12-hour (e.g. 09:00 AM) or 24-hour (e.g. 09:00) format',
    },
  )
  startTime: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^(([01]\d|2[0-3]):([0-5]\d)|(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM|am|pm))$/,
    {
      message:
        'endTime must be in 12-hour (e.g. 05:00 PM) or 24-hour (e.g. 17:30) format',
    },
  )
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate8h?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
