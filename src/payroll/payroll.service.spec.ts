import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PayrollService } from './payroll.service.js';
import { PaymentType } from '../schemas/payout.schema.js';
import {
  AttendanceStatus,
  PaymentStatus,
} from '../schemas/attendance.schema.js';

describe('PayrollService', () => {
  let service: PayrollService;
  let mockPayoutModel: any;
  let mockAttendanceModel: any;
  let mockEmployeeModel: any;

  const employeeId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockPayoutModel = vi.fn().mockImplementation(function (data) {
      return {
        ...data,
        save: vi.fn().mockResolvedValue(data),
      };
    });
    mockPayoutModel.find = vi.fn();

    mockAttendanceModel = {
      find: vi.fn(),
    };

    mockEmployeeModel = {
      findById: vi.fn(),
    };

    service = new PayrollService(
      mockPayoutModel as any,
      mockAttendanceModel as any,
      mockEmployeeModel as any,
    );
  });

  it('should calculate net unpaid balance correctly (totalApproved - totalPaid)', async () => {
    mockEmployeeModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: employeeId,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    mockAttendanceModel.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue([
        {
          calculatedSalary: 240,
          status: AttendanceStatus.APPROVED,
          paymentStatus: PaymentStatus.PAID,
        },
        {
          calculatedSalary: 300,
          status: AttendanceStatus.APPROVED,
          paymentStatus: PaymentStatus.UNPAID,
        },
        {
          calculatedSalary: 180,
          status: AttendanceStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
        },
      ]),
    });

    mockPayoutModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([{ amountPaid: 240, paidAt: new Date() }]),
      }),
    });

    const summary = await service.getEmployeeSummary(employeeId);
    // Total approved = 240 + 300 = 540. Total paid = 240. Net unpaid = 300.
    expect(summary.totalApprovedEarnings).toBe(540);
    expect(summary.totalPaid).toBe(240);
    expect(summary.netUnpaidBalance).toBe(300);
    expect(summary.pendingEarnings).toBe(180);
    expect(summary.pendingCount).toBe(1);
    expect(summary.approvedUnpaidCount).toBe(1);
  });

  it('should perform full settlement reducing balance to 0 and marking records paid', async () => {
    mockEmployeeModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: employeeId,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    // Currently approved unpaid: 2 days @ 240 = ₹480
    const record1 = {
      _id: new Types.ObjectId(),
      calculatedSalary: 240,
      status: AttendanceStatus.APPROVED,
      paymentStatus: PaymentStatus.UNPAID,
      save: vi.fn().mockResolvedValue(true),
    };
    const record2 = {
      _id: new Types.ObjectId(),
      calculatedSalary: 240,
      status: AttendanceStatus.APPROVED,
      paymentStatus: PaymentStatus.UNPAID,
      save: vi.fn().mockResolvedValue(true),
    };

    mockAttendanceModel.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue([record1, record2]),
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([record1, record2]),
      }),
    });

    mockPayoutModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    });

    const payout = await service.settle({
      employeeId,
      amountPaid: 480,
      paymentType: PaymentType.FULL,
    });

    expect(payout.amountPaid).toBe(480);
    expect(payout.balanceBefore).toBe(480);
    expect(payout.balanceAfter).toBe(0);
    expect(record1.paymentStatus).toBe(PaymentStatus.PAID);
    expect(record2.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it('should perform partial settlement carrying remaining unpaid balance forward', async () => {
    mockEmployeeModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: employeeId,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    const record1 = {
      _id: new Types.ObjectId(),
      calculatedSalary: 240,
      status: AttendanceStatus.APPROVED,
      paymentStatus: PaymentStatus.UNPAID,
      save: vi.fn().mockResolvedValue(true),
    };
    const record2 = {
      _id: new Types.ObjectId(),
      calculatedSalary: 240,
      status: AttendanceStatus.APPROVED,
      paymentStatus: PaymentStatus.UNPAID,
      save: vi.fn().mockResolvedValue(true),
    };

    mockAttendanceModel.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue([record1, record2]),
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([record1, record2]),
      }),
    });

    mockPayoutModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    });

    // Total balance is 480, admin pays partial 240
    const payout = await service.settle({
      employeeId,
      amountPaid: 240,
      paymentType: PaymentType.PARTIAL,
    });

    expect(payout.amountPaid).toBe(240);
    expect(payout.balanceBefore).toBe(480);
    expect(payout.balanceAfter).toBe(240);
    // Record 1 was fully covered by 240, so it is marked paid
    expect(record1.paymentStatus).toBe(PaymentStatus.PAID);
    // Record 2 is not fully covered yet, remains unpaid
    expect(record2.paymentStatus).toBe(PaymentStatus.UNPAID);
  });

  it('should throw BadRequestException if partial amount exceeds outstanding balance', async () => {
    mockEmployeeModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: employeeId,
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    mockAttendanceModel.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue([
        {
          calculatedSalary: 240,
          status: AttendanceStatus.APPROVED,
          paymentStatus: PaymentStatus.UNPAID,
        },
      ]),
    });

    mockPayoutModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      }),
    });

    // Balance is 240, paying 300 should throw
    await expect(
      service.settle({
        employeeId,
        amountPaid: 300,
        paymentType: PaymentType.PARTIAL,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
