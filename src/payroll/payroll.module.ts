import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payout, PayoutSchema } from '../schemas/payout.schema.js';
import { Attendance, AttendanceSchema } from '../schemas/attendance.schema.js';
import { Employee, EmployeeSchema } from '../schemas/employee.schema.js';
import { PayrollService } from './payroll.service.js';
import { PayrollController } from './payroll.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payout.name, schema: PayoutSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
