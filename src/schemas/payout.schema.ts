import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type PayoutDocument = Payout & Document;

export enum PaymentType {
  FULL = 'full',
  PARTIAL = 'partial',
}

@Schema({ timestamps: true })
export class Payout {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  // Amount paid in INR (₹)
  @Prop({ required: true, type: Number })
  amountPaid: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(PaymentType),
  })
  paymentType: PaymentType;

  // Outstanding approved unpaid balance before this payment
  @Prop({ required: true, type: Number })
  balanceBefore: number;

  // Remaining unpaid balance after this payment
  @Prop({ required: true, type: Number })
  balanceAfter: number;

  @Prop({ default: Date.now })
  paidAt: Date;

  @Prop({ default: 'cash', trim: true })
  paymentMethod: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Attendance' }],
    default: [],
  })
  settledAttendanceIds: Types.ObjectId[];

  @Prop({ required: false, trim: true })
  note?: string;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);
