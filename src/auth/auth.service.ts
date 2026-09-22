import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Employee,
  EmployeeDocument,
  Role,
} from '../schemas/employee.schema.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async onModuleInit() {
    try {
      // 1. Seed or ensure Admin user exists with phone 9008888569 and password naveed123
      const adminPhone = '9008888569';
      const existingAdmin = await this.employeeModel
        .findOne({ phone: adminPhone })
        .exec();

      if (!existingAdmin) {
        await new this.employeeModel({
          name: 'Naveed (Admin)',
          phone: adminPhone,
          password: 'naveed123',
          role: Role.ADMIN,
          email: 'admin@company.com',
          isActive: true,
        }).save();
        console.log('Default Admin account initialized: 9008888569');
      } else {
        // Ensure admin has correct password and role
        existingAdmin.password = 'naveed123';
        existingAdmin.role = Role.ADMIN;
        await existingAdmin.save();
      }

      // 2. Ensure all other employees have password set to 'test123' if not yet set
      await this.employeeModel
        .updateMany(
          {
            phone: { $ne: adminPhone },
            $or: [{ password: { $exists: false } }, { password: '' }, { password: null }],
          },
          { $set: { password: 'test123' } },
        )
        .exec();
    } catch (err) {
      console.error('Error during auth seeding:', err);
    }
  }

  async login(dto: LoginDto) {
    const cleanPhone = dto.phone.trim();
    const employee = await this.employeeModel.findOne({ phone: cleanPhone }).exec();

    if (!employee || employee.password !== dto.password) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!employee.isActive) {
      throw new UnauthorizedException(
        'This account is deactivated. Please contact the administrator.',
      );
    }

    return {
      success: true,
      user: {
        _id: employee._id.toString(),
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        role: employee.role,
        customDailyRate: employee.customDailyRate,
        designation: employee.designation,
      },
    };
  }
}
