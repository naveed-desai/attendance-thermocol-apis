import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RatesModule } from './rates/rates.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/attendance-management',
      }),
      inject: [ConfigService],
    }),
    RatesModule,
    EmployeesModule,
    AttendanceModule,
    PayrollModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
