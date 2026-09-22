import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmployeeDocument = Employee & Document;

export enum Role {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true, trim: true })
  name: string;

  // Phone number is mandatory and unique
  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  // Password for login
  @Prop({ required: true, default: 'test123' })
  password: string;

  // Email is optional, but unique if provided
  @Prop({ required: false, unique: true, sparse: true, lowercase: true, trim: true })
  email?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(Role),
    default: Role.EMPLOYEE,
  })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false, type: Number })
  customDailyRate?: number;

  @Prop({ required: false, trim: true })
  designation?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
