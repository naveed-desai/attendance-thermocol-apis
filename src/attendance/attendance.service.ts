import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
  PaymentStatus,
} from '../schemas/attendance.schema.js';
import { Employee, EmployeeDocument } from '../schemas/employee.schema.js';
import { RatesService } from '../rates/rates.service.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';

export interface AttendanceFilterQuery {
  employeeId?: string;
  status?: AttendanceStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    private readonly ratesService: RatesService,
  ) {}

  parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const cleaned = timeStr.trim();
    const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }
    return 0;
  }

  calculateWorkMetrics(
    startTime: string,
    endTime: string,
    dailyRate8h: number,
  ) {
    const startTotal = this.parseTimeToMinutes(startTime);
    const endTotal = this.parseTimeToMinutes(endTime);

    let durationMinutes = endTotal - startTotal;
    if (durationMinutes < 0) {
      // Overnight shift
      durationMinutes += 24 * 60;
    }

    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'Start time and end time cannot be identical or invalid',
      );
    }

    const hoursWorked = Math.round((durationMinutes / 60) * 100) / 100;
    // Overtime / undertime proportional rate: (durationMinutes / 480) * dailyRate8h
    const calculatedSalary =
      Math.round(((durationMinutes / 480) * dailyRate8h) * 100) / 100;

    return { durationMinutes, hoursWorked, calculatedSalary };
  }

  async create(dto: CreateAttendanceDto): Promise<Attendance> {
    if (!Types.ObjectId.isValid(dto.employeeId)) {
      throw new BadRequestException(`Invalid employee ID: ${dto.employeeId}`);
    }

    const employee = await this.employeeModel.findById(dto.employeeId).exec();
    if (!employee) {
      throw new NotFoundException(`Employee not found: ${dto.employeeId}`);
    }

    // Check for existing log on the same date
    const existing = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(dto.employeeId),
        date: dto.date,
      })
      .exec();

    if (existing) {
      if (!existing.endTime && dto.endTime) {
        // Complete checkout on active check-in
        const metrics = this.calculateWorkMetrics(
          existing.startTime,
          dto.endTime,
          existing.dailyRate8h,
        );
        existing.endTime = dto.endTime;
        existing.durationMinutes = metrics.durationMinutes;
        existing.hoursWorked = metrics.hoursWorked;
        existing.calculatedSalary = metrics.calculatedSalary;
        return existing.save();
      }
      throw new ConflictException(
        `Attendance for date ${dto.date} has already been logged`,
      );
    }

    // Resolve 8-hour rate: user-provided override or dynamic day rate
    let dailyRate8h = dto.dailyRate8h;
    const resolvedRate = await this.ratesService.resolveRate(
      dto.date,
      employee.customDailyRate,
    );

    if (!dailyRate8h || dailyRate8h <= 0) {
      dailyRate8h = resolvedRate.rate8h;
    }

    let durationMinutes = 0;
    let hoursWorked = 0;
    let calculatedSalary = 0;

    if (dto.endTime) {
      const metrics = this.calculateWorkMetrics(
        dto.startTime,
        dto.endTime,
        dailyRate8h,
      );
      durationMinutes = metrics.durationMinutes;
      hoursWorked = metrics.hoursWorked;
      calculatedSalary = metrics.calculatedSalary;
    }

    const attendance = new this.attendanceModel({
      employeeId: new Types.ObjectId(dto.employeeId),
      date: dto.date,
      dayOfWeek: resolvedRate.dayOfWeek,
      isSunday: resolvedRate.isSunday,
      startTime: dto.startTime,
      endTime: dto.endTime,
      durationMinutes,
      hoursWorked,
      dailyRate8h,
      calculatedSalary,
      status: AttendanceStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      notes: dto.notes,
    });

    return attendance.save();
  }

  async findAll(filter: AttendanceFilterQuery = {}): Promise<Attendance[]> {
    const query: Record<string, any> = {};

    if (filter.employeeId && Types.ObjectId.isValid(filter.employeeId)) {
      query.employeeId = new Types.ObjectId(filter.employeeId);
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.paymentStatus) {
      query.paymentStatus = filter.paymentStatus;
    }

    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }

    return this.attendanceModel
      .find(query)
      .populate('employeeId', 'name email role')
      .sort({ date: -1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid attendance ID: ${id}`);
    }

    const item = await this.attendanceModel
      .findById(id)
      .populate('employeeId', 'name email role')
      .exec();

    if (!item) {
      throw new NotFoundException(`Attendance entry not found: ${id}`);
    }

    return item;
  }

  async updateStatus(
    id: string,
    dto: UpdateAttendanceStatusDto,
  ): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid attendance ID: ${id}`);
    }

    const item = await this.attendanceModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Attendance entry not found: ${id}`);
    }

    if (item.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Cannot modify status of an already paid attendance entry',
      );
    }

    item.status = dto.status;
    if (dto.status === AttendanceStatus.APPROVED) {
      item.approvedAt = new Date();
      item.approvedBy = dto.approvedBy || 'admin';
      item.rejectionReason = undefined;
    } else if (dto.status === AttendanceStatus.REJECTED) {
      item.rejectionReason = dto.rejectionReason || 'Rejected by admin';
    }

    return item.save();
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid attendance ID: ${id}`);
    }

    const item = await this.attendanceModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Attendance entry not found: ${id}`);
    }

    if (item.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Cannot delete an attendance entry that has already been settled/paid',
      );
    }

    await this.attendanceModel.findByIdAndDelete(id).exec();
    return { success: true, id };
  }

  async checkout(id: string, endTime: string): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid attendance ID: ${id}`);
    }

    const attendance = await this.attendanceModel.findById(id).exec();
    if (!attendance) {
      throw new NotFoundException(`Attendance entry not found: ${id}`);
    }

    const metrics = this.calculateWorkMetrics(
      attendance.startTime,
      endTime,
      attendance.dailyRate8h,
    );

    attendance.endTime = endTime;
    attendance.durationMinutes = metrics.durationMinutes;
    attendance.hoursWorked = metrics.hoursWorked;
    attendance.calculatedSalary = metrics.calculatedSalary;
    return attendance.save();
  }
}
