import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Role } from '../../schemas/employee.schema.js';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customDailyRate?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  password?: string;
}
