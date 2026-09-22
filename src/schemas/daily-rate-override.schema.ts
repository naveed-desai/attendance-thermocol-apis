import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyRateOverrideDocument = DailyRateOverride & Document;

@Schema({ timestamps: true })
export class DailyRateOverride {
  // Format: YYYY-MM-DD
  @Prop({ required: true, unique: true, index: true })
  date: string;

  // Rate for 8 hours in INR (₹)
  @Prop({ required: true, type: Number })
  rate8h: number;

  @Prop({ required: false, trim: true })
  reason?: string;

  @Prop({ required: false, trim: true })
  setBy?: string;
}

export const DailyRateOverrideSchema = SchemaFactory.createForClass(DailyRateOverride);
