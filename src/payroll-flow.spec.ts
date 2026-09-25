import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { RatesService } from './rates/rates.service.js';
import { AttendanceService } from './attendance/attendance.service.js';
import { PayrollService } from './payroll/payroll.service.js';
import { PaymentType } from './schemas/payout.schema.js';
import {
  AttendanceStatus,
  PaymentStatus,
} from './schemas/attendance.schema.js';

describe('End-to-End Workflow: Attendance, Dynamic Rates, Approvals & Full/Partial Settlements', () => {
  let ratesService: RatesService;
  let attendanceService: AttendanceService;
  let payrollService: PayrollService;

  // In-memory data store for E2E flow
  let overridesStore: Map<string, any>;
  let employeesStore: Map<string, any>;
  let attendanceStore: Map<string, any>;
  let payoutsStore: any[];

  const employeeId = new Types.ObjectId().toString();

  beforeEach(() => {
    overridesStore = new Map();
    employeesStore = new Map();
    attendanceStore = new Map();
    payoutsStore = [];

    // Seed employee
    employeesStore.set(employeeId, {
      _id: new Types.ObjectId(employeeId),
      name: 'Ramesh Patel',
      phone: '9876543210',
      email: 'ramesh@example.com',
      role: 'employee',
      customDailyRate: undefined,
      isActive: true,
    });

    // Mock Override Model
    const mockOverrideModel: any = {
      findOne: vi.fn().mockImplementation((query: any) => ({
        exec: vi.fn().mockImplementation(async () => {
          return overridesStore.get(query.date) || null;
        }),
      })),
      findOneAndUpdate: vi.fn().mockImplementation((query: any, update: any) => ({
        exec: vi.fn().mockImplementation(async () => {
          overridesStore.set(query.date, { ...update, date: query.date });
          return overridesStore.get(query.date);
        }),
      })),
      find: vi.fn().mockImplementation(() => ({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockImplementation(async () => Array.from(overridesStore.values())),
        }),
      })),
      findOneAndDelete: vi.fn().mockImplementation((query: any) => ({
        exec: vi.fn().mockImplementation(async () => {
          const item = overridesStore.get(query.date);
          overridesStore.delete(query.date);
          return item;
        }),
      })),
    };

    ratesService = new RatesService(mockOverrideModel);

    // Mock Attendance Model
    const mockAttendanceModel: any = vi.fn().mockImplementation(function (data: any) {
      const id = new Types.ObjectId().toString();
      const entity = {
        _id: new Types.ObjectId(id),
        ...data,
        save: vi.fn().mockImplementation(async () => {
          attendanceStore.set(id, entity);
          return entity;
        }),
      };
      return entity;
    });

    mockAttendanceModel.findOne = vi.fn().mockImplementation((query: any) => ({
      exec: vi.fn().mockImplementation(async () => {
        for (const item of attendanceStore.values()) {
          if (
            item.employeeId.toString() === query.employeeId.toString() &&
            item.date === query.date
          ) {
            return item;
          }
        }
        return null;
      }),
    }));

    const filterAttendance = (query: any) => {
      return Array.from(attendanceStore.values()).filter((item) => {
        if (query.employeeId && item.employeeId.toString() !== query.employeeId.toString()) {
          return false;
        }
        if (query.status && item.status !== query.status) {
          return false;
        }
        if (query.paymentStatus && item.paymentStatus !== query.paymentStatus) {
          return false;
        }
        return true;
      });
    };

    mockAttendanceModel.find = vi.fn().mockImplementation((query: any) => ({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockImplementation((sortObj: any) => ({
        exec: vi.fn().mockImplementation(async () => {
          const items = filterAttendance(query);
          if (sortObj?.date === 1) {
            items.sort((a, b) => a.date.localeCompare(b.date));
          } else if (sortObj?.date === -1) {
            items.sort((a, b) => b.date.localeCompare(a.date));
          }
          return items;
        }),
      })),
      exec: vi.fn().mockImplementation(async () => filterAttendance(query)),
    }));

    mockAttendanceModel.findById = vi.fn().mockImplementation((id: string) => ({
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockImplementation(async () => attendanceStore.get(id) || null),
    }));

    // Mock Employee Model
    const mockEmployeeModel: any = {
      findById: vi.fn().mockImplementation((id: string) => ({
        exec: vi.fn().mockImplementation(async () => employeesStore.get(id) || null),
      })),
    };

    // Mock Payout Model
    const mockPayoutModel: any = vi.fn().mockImplementation(function (data: any) {
      const id = new Types.ObjectId().toString();
      const entity = {
        _id: new Types.ObjectId(id),
        ...data,
        save: vi.fn().mockImplementation(async () => {
          payoutsStore.unshift(entity);
          return entity;
        }),
      };
      return entity;
    });

    mockPayoutModel.find = vi.fn().mockImplementation((query: any) => ({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockImplementation(async () => {
          return payoutsStore.filter(
            (p) => p.employeeId.toString() === query.employeeId.toString(),
          );
        }),
      }),
    }));

    attendanceService = new AttendanceService(
      mockAttendanceModel,
      mockEmployeeModel,
      ratesService,
    );

    payrollService = new PayrollService(
      mockPayoutModel,
      mockAttendanceModel,
      mockEmployeeModel,
    );
  });

  it('verifies the full multi-phase lifecycle end-to-end', async () => {
    // 1. Configure Special Date Override (e.g. Festival on 2026-09-25)
    await ratesService.setOverride({
      date: '2026-09-25',
      rate8h: 300,
      reason: 'Festival Special',
    });

    // Verify rate resolution:
    // Regular Monday (2026-09-21) -> ₹240
    const mondayRate = await ratesService.resolveRate('2026-09-21');
    expect(mondayRate.rate8h).toBe(240);
    expect(mondayRate.isSunday).toBe(false);

    // Sunday (2026-09-20) -> employee base rate ₹240 (no extra Sunday surcharge)
    const sundayRate = await ratesService.resolveRate('2026-09-20');
    expect(sundayRate.rate8h).toBe(240);
    expect(sundayRate.isSunday).toBe(true);

    // Overridden Day (2026-09-25) -> ₹300
    const overrideRate = await ratesService.resolveRate('2026-09-25');
    expect(overrideRate.rate8h).toBe(300);
    expect(overrideRate.source).toBe('override');

    // 2. Employee Logs 4 Shifts
    // Shift A: Regular Monday, 8 hours (09:00 - 17:00) @ 240 rate -> ₹240.00
    const shiftA = await attendanceService.create({
      employeeId,
      date: '2026-09-21',
      startTime: '09:00',
      endTime: '17:00',
    });
    expect(shiftA.hoursWorked).toBe(8);
    expect(shiftA.calculatedSalary).toBe(240);
    expect(shiftA.status).toBe(AttendanceStatus.PENDING);

    // Shift B: Tuesday Overtime, 10 hours (09:00 - 19:00) @ 240 rate -> (10/8)*240 = ₹300.00
    const shiftB = await attendanceService.create({
      employeeId,
      date: '2026-09-22',
      startTime: '09:00',
      endTime: '19:00',
    });
    expect(shiftB.hoursWorked).toBe(10);
    expect(shiftB.calculatedSalary).toBe(300);

    // Shift C: Sunday Undertime, 6 hours (09:00 - 15:00) @ 240 employee rate -> (6/8)*240 = ₹180.00
    const shiftC = await attendanceService.create({
      employeeId,
      date: '2026-09-20',
      startTime: '09:00',
      endTime: '15:00',
    });
    expect(shiftC.isSunday).toBe(true);
    expect(shiftC.hoursWorked).toBe(6);
    expect(shiftC.calculatedSalary).toBe(180);

    // Shift D: Festival Shift, 8 hours (09:00 - 17:00) @ 300 override rate -> ₹300.00
    const shiftD = await attendanceService.create({
      employeeId,
      date: '2026-09-25',
      startTime: '09:00',
      endTime: '17:00',
    });
    expect(shiftD.calculatedSalary).toBe(300);

    // 3. Admin Reviews & Approves Shifts A, B, C; Rejects Shift D
    await attendanceService.updateStatus(shiftA._id.toString(), {
      status: AttendanceStatus.APPROVED,
      approvedBy: 'Admin',
    });
    await attendanceService.updateStatus(shiftB._id.toString(), {
      status: AttendanceStatus.APPROVED,
      approvedBy: 'Admin',
    });
    await attendanceService.updateStatus(shiftC._id.toString(), {
      status: AttendanceStatus.APPROVED,
      approvedBy: 'Admin',
    });
    await attendanceService.updateStatus(shiftD._id.toString(), {
      status: AttendanceStatus.REJECTED,
      rejectionReason: 'Shift disputed by supervisor',
      approvedBy: 'Admin',
    });

    // 4. Verify Ledger Before Settlement
    // Total Approved = Shift A (240) + Shift B (300) + Shift C (180) = ₹720.00
    const summaryBefore = await payrollService.getEmployeeSummary(employeeId);
    expect(summaryBefore.totalApprovedEarnings).toBe(720);
    expect(summaryBefore.totalPaid).toBe(0);
    expect(summaryBefore.netUnpaidBalance).toBe(720);
    expect(summaryBefore.approvedUnpaidCount).toBe(3);

    // 5. Admin Executes Partial Payout of ₹300
    const partialPayout = await payrollService.settle({
      employeeId,
      amountPaid: 300,
      paymentType: PaymentType.PARTIAL,
      paymentMethod: 'upi',
      note: 'Advance payment for week 1',
    });

    expect(partialPayout.amountPaid).toBe(300);
    expect(partialPayout.balanceBefore).toBe(720);
    expect(partialPayout.balanceAfter).toBe(420);

    // Shift C (chronologically earliest: 2026-09-20, ₹180) is fully covered by ₹300, so it is marked PAID
    expect(shiftC.paymentStatus).toBe(PaymentStatus.PAID);

    // 6. Verify Summary After Partial Settlement
    const summaryAfterPartial = await payrollService.getEmployeeSummary(employeeId);
    expect(summaryAfterPartial.totalApprovedEarnings).toBe(720);
    expect(summaryAfterPartial.totalPaid).toBe(300);
    expect(summaryAfterPartial.netUnpaidBalance).toBe(420);

    // 7. Admin Executes Full Settlement for the Remaining ₹420.00
    const fullPayout = await payrollService.settle({
      employeeId,
      amountPaid: 420,
      paymentType: PaymentType.FULL,
      paymentMethod: 'bank_transfer',
      note: 'Final settlement of remaining balance',
    });

    expect(fullPayout.amountPaid).toBe(420);
    expect(fullPayout.balanceBefore).toBe(420);
    expect(fullPayout.balanceAfter).toBe(0);

    // All approved shifts are now marked PAID
    expect(shiftA.paymentStatus).toBe(PaymentStatus.PAID);
    expect(shiftB.paymentStatus).toBe(PaymentStatus.PAID);
    expect(shiftC.paymentStatus).toBe(PaymentStatus.PAID);

    // 8. Verify Ledger is Fully Settled
    const summaryFinal = await payrollService.getEmployeeSummary(employeeId);
    expect(summaryFinal.totalApprovedEarnings).toBe(720);
    expect(summaryFinal.totalPaid).toBe(720);
    expect(summaryFinal.netUnpaidBalance).toBe(0);
    expect(summaryFinal.approvedUnpaidCount).toBe(0);
    expect(summaryFinal.payouts.length).toBe(2);
  });
});
