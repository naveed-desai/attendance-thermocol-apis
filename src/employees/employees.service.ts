import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee, EmployeeDocument } from '../schemas/employee.schema.js';
import {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
} from '../schemas/attendance.schema.js';
import { Payout, PayoutDocument } from '../schemas/payout.schema.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

export interface EmployeeWithStats {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  customDailyRate?: number;
  designation?: string;
  isActive: boolean;
  createdAt: Date;
  totalApprovedSalary: number;
  totalPaidSalary: number;
  netUnpaidBalance: number;
  pendingCount: number;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    // 1. Mandatory phone uniqueness check
    const existingPhone = await this.employeeModel
      .findOne({ phone: dto.phone.trim() })
      .exec();
    if (existingPhone) {
      throw new ConflictException('An employee with this phone number already exists');
    }

    // 2. Optional email uniqueness check (if provided)
    if (dto.email && dto.email.trim()) {
      const existingEmail = await this.employeeModel
        .findOne({ email: dto.email.toLowerCase().trim() })
        .exec();
      if (existingEmail) {
        throw new ConflictException('An employee with this email already exists');
      }
    }

    const employee = new this.employeeModel({
      ...dto,
      phone: dto.phone.trim(),
      password: dto.password ? dto.password.trim() : 'test123',
      email: dto.email && dto.email.trim() ? dto.email.toLowerCase().trim() : undefined,
    });
    return employee.save();
  }

  async findAll(includeInactive = false): Promise<EmployeeWithStats[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const employees = await this.employeeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    const results: EmployeeWithStats[] = [];
    for (const emp of employees) {
      const stats = await this.getEmployeeBalanceStats(emp._id.toString());
      results.push({
        _id: emp._id.toString(),
        name: emp.name,
        email: emp.email,
        role: emp.role,
        customDailyRate: emp.customDailyRate,
        phone: emp.phone,
        designation: emp.designation,
        isActive: emp.isActive,
        createdAt: (emp as any).createdAt,
        totalApprovedSalary: stats.totalApprovedSalary,
        totalPaidSalary: stats.totalPaidSalary,
        netUnpaidBalance: stats.netUnpaidBalance,
        pendingCount: stats.pendingCount,
      });
    }

    return results;
  }

  async findOne(id: string): Promise<EmployeeWithStats> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid employee ID: ${id}`);
    }

    const emp = await this.employeeModel.findById(id).exec();
    if (!emp) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const stats = await this.getEmployeeBalanceStats(id);
    return {
      _id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      role: emp.role,
      customDailyRate: emp.customDailyRate,
      phone: emp.phone,
      designation: emp.designation,
      isActive: emp.isActive,
      createdAt: (emp as any).createdAt,
      totalApprovedSalary: stats.totalApprovedSalary,
      totalPaidSalary: stats.totalPaidSalary,
      netUnpaidBalance: stats.netUnpaidBalance,
      pendingCount: stats.pendingCount,
    };
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid employee ID: ${id}`);
    }

    const payload: Record<string, any> = { ...dto };
    if (payload.password) {
      payload.password = payload.password.trim();
    }
    if (payload.phone) {
      payload.phone = payload.phone.trim();
    }
    if (payload.email) {
      payload.email = payload.email.toLowerCase().trim();
    }

    const updated = await this.employeeModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid employee ID: ${id}`);
    }

    const deleted = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return { success: true, id };
  }

  async getEmployeeBalanceStats(employeeId: string) {
    const empObjId = new Types.ObjectId(employeeId);

    // Sum all approved attendance records
    const approvedAttendance = await this.attendanceModel
      .find({
        employeeId: empObjId,
        status: AttendanceStatus.APPROVED,
      })
      .exec();

    const totalApprovedSalary = approvedAttendance.reduce(
      (sum, item) => sum + (item.calculatedSalary || 0),
      0,
    );

    // Sum all payouts to date
    const payouts = await this.payoutModel
      .find({ employeeId: empObjId })
      .exec();

    const totalPaidSalary = payouts.reduce(
      (sum, item) => sum + (item.amountPaid || 0),
      0,
    );

    // Count pending attendance records
    const pendingCount = await this.attendanceModel
      .countDocuments({
        employeeId: empObjId,
        status: AttendanceStatus.PENDING,
      })
      .exec();

    const netUnpaidBalance = Math.max(
      0,
      Math.round((totalApprovedSalary - totalPaidSalary) * 100) / 100,
    );

    return {
      totalApprovedSalary: Math.round(totalApprovedSalary * 100) / 100,
      totalPaidSalary: Math.round(totalPaidSalary * 100) / 100,
      netUnpaidBalance,
      pendingCount,
    };
  }
}
