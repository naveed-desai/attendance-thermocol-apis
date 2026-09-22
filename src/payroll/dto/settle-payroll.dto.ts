import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentType } from '../../schemas/payout.schema.js';

export class SettlePayrollDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'amountPaid must be greater than 0' })
  amountPaid: number;

  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
