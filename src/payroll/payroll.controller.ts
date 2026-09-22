import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { SettlePayrollDto } from './dto/settle-payroll.dto.js';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('summary/:employeeId')
  async getEmployeeSummary(@Param('employeeId') employeeId: string) {
    return this.payrollService.getEmployeeSummary(employeeId);
  }

  @Get('payouts')
  async getAllPayouts(@Query('employeeId') employeeId?: string) {
    return this.payrollService.getAllPayouts(employeeId);
  }

  @Post('settle')
  async settle(@Body() settlePayrollDto: SettlePayrollDto) {
    return this.payrollService.settle(settlePayrollDto);
  }
}
