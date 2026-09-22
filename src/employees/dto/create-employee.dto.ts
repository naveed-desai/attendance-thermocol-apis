import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Role } from '../../schemas/employee.schema.js';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  // Phone number is mandatory
  @IsNotEmpty()
  @IsString()
  phone: string;

  // Email is optional
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
  designation?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
