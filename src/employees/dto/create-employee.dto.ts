import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Role } from '../../schemas/employee.schema.js';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  // Phone number is mandatory (strictly 10 digits)
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
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
