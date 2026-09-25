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

  it('should calculate 8 hours (480 mins) on custom ₹250 rate as ₹250.00', () => {
    const metrics = service.calculateWorkMetrics('09:00', '17:00', 250);
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(250);
  });

  it('should calculate 9.5 hours (570 mins) on custom ₹250 rate floored to integer ₹296', () => {
    const metrics = service.calculateWorkMetrics('09:00', '18:30', 250);
    expect(metrics.durationMinutes).toBe(570);
    expect(metrics.hoursWorked).toBe(9.5);
    expect(metrics.calculatedSalary).toBe(296); // Floored on daily basis from 296.875
  });

  it('should floor daily salary to integer when duration produces .50 (e.g. 485 mins @ ₹240 rate -> ₹242)', () => {
    // 485 mins = 8h 5m. (485 / 480) * 240 = 242.50 -> floored to 242
    const metrics = service.calculateWorkMetrics('09:00', '17:05', 240);
    expect(metrics.durationMinutes).toBe(485);
    expect(metrics.calculatedSalary).toBe(242);
  });

  it('should correctly ceil checkin time and floor checkout time when required', () => {
    // Check-in at 09:02 AM ceils to 09:05 AM
    // Check-out at 05:08 PM floors to 05:05 PM
    const metrics = service.calculateWorkMetrics('09:02 AM', '05:08 PM', 240);
    expect(metrics.roundedStartTime).toBe('09:05 AM');
    expect(metrics.roundedEndTime).toBe('05:05 PM');
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.hoursWorked).toBe(8);
    expect(metrics.calculatedSalary).toBe(240);
  });

  it('should ceil 24h checkin time and floor 24h checkout time when required', () => {
    // Check-in at 09:01 ceils to 09:05
    // Check-out at 17:04 floors to 17:00
    const metrics = service.calculateWorkMetrics('09:01', '17:04', 240);
    expect(metrics.roundedStartTime).toBe('09:05');
    expect(metrics.roundedEndTime).toBe('17:00');
    expect(metrics.durationMinutes).toBe(475);
    // (475 / 480) * 240 = 237.50 -> floored to 237
    expect(metrics.calculatedSalary).toBe(237);
  });

  it('should not alter times that already align on 5-minute intervals', () => {
    const metrics = service.calculateWorkMetrics('09:00 AM', '05:00 PM', 240);
    expect(metrics.roundedStartTime).toBe('09:00 AM');
    expect(metrics.roundedEndTime).toBe('05:00 PM');
    expect(metrics.durationMinutes).toBe(480);
    expect(metrics.calculatedSalary).toBe(240);
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
