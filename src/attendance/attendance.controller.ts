import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceStatusDto } from './dto/update-attendance-status.dto.js';
import {
  AttendanceStatus,
  PaymentStatus,
} from '../schemas/attendance.schema.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.findAll({
      employeeId,
      status,
      paymentStatus,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceStatusDto,
  ) {
    return this.attendanceService.updateStatus(id, dto);
  }

  @Patch(':id/checkout')
  async checkout(
    @Param('id') id: string,
    @Body('endTime') endTime: string,
  ) {
    return this.attendanceService.checkout(id, endTime);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
