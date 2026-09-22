import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payout,
  PayoutDocument,
  PaymentType,
} from '../schemas/payout.schema.js';
import {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
  PaymentStatus,
} from '../schemas/attendance.schema.js';
import { Employee, EmployeeDocument } from '../schemas/employee.schema.js';
import { SettlePayrollDto } from './dto/settle-payroll.dto.js';

export interface PayrollSummary {
  employeeId: string;
  employeeName: string;
  employeePhone?: string;
  employeeEmail?: string;
  totalApprovedEarnings: number;
  totalPaid: number;
  netUnpaidBalance: number;
  pendingEarnings: number;
  pendingCount: number;
  approvedUnpaidCount: number;
  lastPaidDate?: Date;
  payouts: Payout[];
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async getEmployeeSummary(employeeId: string): Promise<PayrollSummary> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException(`Invalid employee ID: ${employeeId}`);
    }

    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee not found: ${employeeId}`);
    }

    const empObjId = new Types.ObjectId(employeeId);

    // All attendance records
    const attendanceRecords = await this.attendanceModel
      .find({ employeeId: empObjId })
      .exec();

    let totalApprovedEarnings = 0;
    let approvedUnpaidCount = 0;
    let pendingEarnings = 0;
    let pendingCount = 0;

    for (const record of attendanceRecords) {
      if (record.status === AttendanceStatus.APPROVED) {
        totalApprovedEarnings += record.calculatedSalary || 0;
        if (record.paymentStatus === PaymentStatus.UNPAID) {
          approvedUnpaidCount++;
        }
      } else if (record.status === AttendanceStatus.PENDING) {
        pendingEarnings += record.calculatedSalary || 0;
        pendingCount++;
      }
    }

    // All payouts
    const payouts = await this.payoutModel
      .find({ employeeId: empObjId })
      .sort({ paidAt: -1 })
      .exec();

    const totalPaid = payouts.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0,
    );

    const netUnpaidBalance = Math.max(
      0,
      Math.round((totalApprovedEarnings - totalPaid) * 100) / 100,
    );

    return {
      employeeId,
      employeeName: employee.name,
      employeePhone: employee.phone,
      employeeEmail: employee.email,
      totalApprovedEarnings: Math.round(totalApprovedEarnings * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      netUnpaidBalance,
      pendingEarnings: Math.round(pendingEarnings * 100) / 100,
      pendingCount,
      approvedUnpaidCount,
      lastPaidDate: payouts.length > 0 ? payouts[0].paidAt : undefined,
      payouts,
    };
  }

  async getAllPayouts(employeeId?: string): Promise<Payout[]> {
    const filter: Record<string, any> = {};
    if (employeeId && Types.ObjectId.isValid(employeeId)) {
      filter.employeeId = new Types.ObjectId(employeeId);
    }

    return this.payoutModel
      .find(filter)
      .populate('employeeId', 'name email role')
      .sort({ paidAt: -1 })
      .exec();
  }

  async settle(dto: SettlePayrollDto): Promise<Payout> {
    if (!Types.ObjectId.isValid(dto.employeeId)) {
      throw new BadRequestException(`Invalid employee ID: ${dto.employeeId}`);
    }

    const employee = await this.employeeModel.findById(dto.employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee not found: ${dto.employeeId}`);
    }

    const summary = await this.getEmployeeSummary(dto.employeeId);
    const balanceBefore = summary.netUnpaidBalance;

    if (balanceBefore <= 0) {
      throw new BadRequestException(
        'There is no outstanding approved balance to settle for this employee',
      );
    }

    let amountToPay = dto.amountPaid;
    if (dto.paymentType === PaymentType.FULL) {
      amountToPay = balanceBefore;
    } else {
      if (amountToPay > balanceBefore) {
        throw new BadRequestException(
          `Payment amount (₹${amountToPay}) cannot exceed outstanding unpaid balance of ₹${balanceBefore}`,
        );
      }
    }

    amountToPay = Math.round(amountToPay * 100) / 100;
    const balanceAfter = Math.round((balanceBefore - amountToPay) * 100) / 100;

    // Allocate payment against unpaid approved attendance in chronological order
    const unpaidRecords = await this.attendanceModel
      .find({
        employeeId: new Types.ObjectId(dto.employeeId),
        status: AttendanceStatus.APPROVED,
        paymentStatus: PaymentStatus.UNPAID,
      })
      .sort({ date: 1 })
      .exec();

    const settledIds: Types.ObjectId[] = [];
    const payoutId = new Types.ObjectId();

    if (dto.paymentType === PaymentType.FULL || balanceAfter === 0) {
      // Settle all unpaid approved records
      for (const rec of unpaidRecords) {
        rec.paymentStatus = PaymentStatus.PAID;
        rec.payoutId = payoutId;
        await rec.save();
        settledIds.push(rec._id as Types.ObjectId);
      }
    } else {
      // Partial payment: mark chronological days that are completely covered
      let remainingFund = amountToPay;
      for (const rec of unpaidRecords) {
        if (remainingFund >= rec.calculatedSalary) {
          rec.paymentStatus = PaymentStatus.PAID;
          rec.payoutId = payoutId;
          await rec.save();
          settledIds.push(rec._id as Types.ObjectId);
          remainingFund = Math.round((remainingFund - rec.calculatedSalary) * 100) / 100;
        } else {
          // Record is not fully covered yet; stop marking
          break;
        }
      }
    }

    const payout = new this.payoutModel({
      _id: payoutId,
      employeeId: new Types.ObjectId(dto.employeeId),
      amountPaid: amountToPay,
      paymentType: dto.paymentType,
      balanceBefore,
      balanceAfter,
      paidAt: new Date(),
      paymentMethod: dto.paymentMethod || 'cash',
      settledAttendanceIds: settledIds,
      note: dto.note,
    });

    return payout.save();
  }
}
