import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyRateOverrideDocument = DailyRateOverride & Document;

@Schema({ timestamps: true })
export class DailyRateOverride {
  // Format: YYYY-MM-DD
  @Prop({ required: true, unique: true, index: true })
  date: string;

  // Daily bonus / increment amount in INR (₹) added to each employee's base daily wage
  @Prop({ required: false, type: Number, default: 0 })
  bonus8h?: number;

  // Optional legacy rate for 8 hours in INR (₹)
  @Prop({ required: false, type: Number })
  rate8h?: number;

  @Prop({ required: false, trim: true })
  reason?: string;

  @Prop({ required: false, trim: true })
  setBy?: string;
}

export const DailyRateOverrideSchema = SchemaFactory.createForClass(DailyRateOverride);
