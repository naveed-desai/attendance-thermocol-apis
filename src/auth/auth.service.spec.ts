import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Role } from '../schemas/employee.schema.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockEmployeeModel: any;

  beforeEach(() => {
    mockEmployeeModel = {
      findOne: vi.fn(),
      updateMany: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(true) }),
    };
    authService = new AuthService(mockEmployeeModel);
  });

  it('should authenticate admin with phone 9008888569 and password naveed123', async () => {
    mockEmployeeModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: 'admin-id-123',
        name: 'Naveed (Admin)',
        phone: '9008888569',
        password: 'naveed123',
        role: Role.ADMIN,
        isActive: true,
      }),
    });

    const result = await authService.login({
      phone: '9008888569',
      password: 'naveed123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe(Role.ADMIN);
    expect(result.user.phone).toBe('9008888569');
  });

  it('should authenticate employee with phone and password test123', async () => {
    mockEmployeeModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: 'emp-id-456',
        name: 'John Staff',
        phone: '9876543210',
        password: 'test123',
        role: Role.EMPLOYEE,
        isActive: true,
      }),
    });

    const result = await authService.login({
      phone: '9876543210',
      password: 'test123',
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe(Role.EMPLOYEE);
    expect(result.user.name).toBe('John Staff');
  });

  it('should reject invalid password with UnauthorizedException', async () => {
    mockEmployeeModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: 'admin-id-123',
        name: 'Naveed (Admin)',
        phone: '9008888569',
        password: 'naveed123',
        role: Role.ADMIN,
        isActive: true,
      }),
    });

    await expect(
      authService.login({
        phone: '9008888569',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject nonexistent phone with UnauthorizedException', async () => {
    mockEmployeeModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    await expect(
      authService.login({
        phone: '0000000000',
        password: 'test123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
