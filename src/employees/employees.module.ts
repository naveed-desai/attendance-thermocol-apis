import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '../schemas/employee.schema.js';
import { Attendance, AttendanceSchema } from '../schemas/attendance.schema.js';
import { Payout, PayoutSchema } from '../schemas/payout.schema.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Payout.name, schema: PayoutSchema },
    ]),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
