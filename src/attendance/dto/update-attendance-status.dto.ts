import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../../schemas/attendance.schema.js';

export class UpdateAttendanceStatusDto {
  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
