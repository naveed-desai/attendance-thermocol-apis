import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../schemas/attendance.schema.js';
import { Employee, EmployeeSchema } from '../schemas/employee.schema.js';
import { RatesModule } from '../rates/rates.module.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    RatesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
