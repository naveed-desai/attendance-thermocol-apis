import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService - Salary & Time Calculations', () => {
  let service: AttendanceService;

  beforeEach(() => {
    const mockAttendanceModel: any = {};
    const mockEmployeeModel: any = {};
    const mockRatesService: any = {};
    service = new AttendanceService(
      mockAttendanceModel,
      mockEmployeeModel,
      mockRatesService,
    );
  });

  it('should calculate standard 8 hours (480 mins) on ₹240 rate as ₹240.00', () => {
    const metrics = service.calculateWorkMetrics('09:00', '17:00', 240);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(240);
  });

  it('should calculate overtime 10 hours (600 mins) on ₹240 rate as ₹300.00 without bonus multiplier', () => {
    const metrics = service.calculateWorkMetrics('09:00', '19:00', 240);
    expect(metrics.durationMinutes).toBe(600);
    expect(metrics.hoursWorked).toBe(10);
    expect(metrics.calculatedSalary).toBe(300);
  });

  it('should calculate undertime 6 hours (360 mins) on ₹240 rate as ₹180.00', () => {
    const metrics = service.calculateWorkMetrics('09:00', '15:00', 240);
    expect(metrics.durationMinutes).toBe(360);
    expect(metrics.hoursWorked).toBe(6);
    expect(metrics.calculatedSalary).toBe(180);
  });

  it('should calculate Sunday 8 hours (480 mins) on ₹250 rate as ₹250.00', () => {
    const metrics = service.calculateWorkMetrics('09:00', '17:00', 250);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(250);
  });

  it('should calculate Sunday 9.5 hours (570 mins) on ₹250 rate as ₹296.88', () => {
    const metrics = service.calculateWorkMetrics('09:00', '18:30', 250);
    expect(metrics.durationMinutes).toBe(570);
    expect(metrics.hoursWorked).toBe(9.5);
    expect(metrics.calculatedSalary).toBe(296.88);
  });

  it('should correctly handle overnight shifts (e.g. 22:00 to 06:00 = 8h)', () => {
    const metrics = service.calculateWorkMetrics('22:00', '06:00', 240);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(240);
  });

  it('should correctly calculate metrics for 12-hour format (09:00 AM to 05:00 PM = 8h)', () => {
    const metrics = service.calculateWorkMetrics('09:00 AM', '05:00 PM', 240);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(240);
  });

  it('should correctly calculate overtime in 12-hour format (09:00 AM to 07:30 PM = 10.5h)', () => {
    const metrics = service.calculateWorkMetrics('09:00 AM', '07:30 PM', 240);
    expect(metrics.durationMinutes).toBe(630);
    expect(metrics.hoursWorked).toBe(10.5);
    expect(metrics.calculatedSalary).toBe(315);
  });

  it('should correctly handle overnight shifts in 12-hour format (10:00 PM to 06:00 AM = 8h)', () => {
    const metrics = service.calculateWorkMetrics('10:00 PM', '06:00 AM', 240);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(240);
  });
});
