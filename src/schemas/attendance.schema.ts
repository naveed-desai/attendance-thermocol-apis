import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

export enum AttendanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  // Format: YYYY-MM-DD
  @Prop({ required: true, index: true })
  date: string;

  @Prop({ required: true })
  dayOfWeek: string;

  @Prop({ default: false })
  isSunday: boolean;

  // 24-hour time format (HH:mm), e.g. "09:00"
  @Prop({ required: true })
  startTime: string;

  // 24-hour time format (HH:mm), e.g. "17:30" (optional until checkout)
  @Prop({ required: false })
  endTime?: string;

  @Prop({ required: true, type: Number, default: 0 })
  durationMinutes: number;

  @Prop({ required: true, type: Number, default: 0 })
  hoursWorked: number;

  // Daily rate for standard 8 hours in INR (₹)
  @Prop({ required: true, type: Number })
  dailyRate8h: number;

  // Calculated salary for actual hours: (hoursWorked / 8) * dailyRate8h
  @Prop({ required: true, type: Number, default: 0 })
  calculatedSalary: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AttendanceStatus),
    default: AttendanceStatus.PENDING,
    index: true,
  })
  status: AttendanceStatus;

  @Prop({ required: false, trim: true })
  rejectionReason?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.UNPAID,
    index: true,
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payout', required: false })
  payoutId?: Types.ObjectId;

  @Prop({ required: false })
  approvedAt?: Date;

  @Prop({ required: false, trim: true })
  approvedBy?: string;

  @Prop({ required: false, trim: true })
  notes?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Compound index to quickly find attendance by employee and date
AttendanceSchema.index({ employeeId: 1, date: 1 });
