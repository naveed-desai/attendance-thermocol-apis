import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RatesService } from './rates.service.js';

describe('RatesService', () => {
  let service: RatesService;
  let mockOverrideModel: any;

  beforeEach(() => {
    mockOverrideModel = {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      findOneAndDelete: vi.fn(),
    };
    service = new RatesService(mockOverrideModel);
  });

  it('should calculate Sunday with employee base rate with NO extra Sunday surcharge', async () => {
    // 2026-09-20 is Sunday
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    // Default rate (₹240)
    const rateDefault = await service.resolveRate('2026-09-20');
    expect(rateDefault.isSunday).toBe(true);
    expect(rateDefault.dayOfWeek).toBe('Sunday');
    expect(rateDefault.rate8h).toBe(240);
    expect(rateDefault.hourlyRate).toBe(30);
    expect(rateDefault.bonus8h).toBe(0);

    // Custom employee rate (₹250) on Sunday
    const rateCustom = await service.resolveRate('2026-09-20', 250);
    expect(rateCustom.isSunday).toBe(true);
    expect(rateCustom.rate8h).toBe(250);
    expect(rateCustom.hourlyRate).toBe(31.25);
    expect(rateCustom.bonus8h).toBe(0);
    expect(rateCustom.source).toBe('employee_custom');
  });

  it('should identify regular day (Monday) and apply standard default rate (₹240)', async () => {
    // 2026-09-21 is Monday
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const rate = await service.resolveRate('2026-09-21');
    expect(rate.isSunday).toBe(false);
    expect(rate.dayOfWeek).toBe('Monday');
    expect(rate.rate8h).toBe(240);
    expect(rate.hourlyRate).toBe(30);
    expect(rate.source).toBe('standard_default');
  });

  it('should apply additive date bonus to each employee rate (e.g. +10 bonus -> 240 becomes 250, 250 becomes 260)', async () => {
    // Admin sets a bonus of ₹10 for this date
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        date: '2026-09-21',
        bonus8h: 10,
        reason: 'Daily Bonus',
      }),
    });

    // Employee A with rate ₹240 -> becomes ₹250
    const rateA = await service.resolveRate('2026-09-21', 240);
    expect(rateA.baseRate8h).toBe(240);
    expect(rateA.bonus8h).toBe(10);
    expect(rateA.rate8h).toBe(250);
    expect(rateA.hourlyRate).toBe(31.25);
    expect(rateA.source).toBe('override');
    expect(rateA.reason).toBe('Daily Bonus');

    // Employee B with rate ₹250 -> becomes ₹260
    const rateB = await service.resolveRate('2026-09-21', 250);
    expect(rateB.baseRate8h).toBe(250);
    expect(rateB.bonus8h).toBe(10);
    expect(rateB.rate8h).toBe(260);
    expect(rateB.hourlyRate).toBe(32.5);
    expect(rateB.source).toBe('override');
  });

  it('should support legacy rate8h override by deriving bonus amount', async () => {
    // Legacy override with rate8h = 300 (+60 over 240)
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        date: '2026-09-21',
        rate8h: 300,
        reason: 'Festival Special',
      }),
    });

    // Employee with rate ₹240 -> becomes ₹300
    const rateA = await service.resolveRate('2026-09-21', 240);
    expect(rateA.rate8h).toBe(300);
    expect(rateA.bonus8h).toBe(60);

    // Employee with rate ₹250 -> gets +60 = ₹310
    const rateB = await service.resolveRate('2026-09-21', 250);
    expect(rateB.rate8h).toBe(310);
    expect(rateB.bonus8h).toBe(60);
  });

  it('should apply employee custom daily rate if no admin override exists', async () => {
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const rate = await service.resolveRate('2026-09-21', 280);
    expect(rate.rate8h).toBe(280);
    expect(rate.hourlyRate).toBe(35);
    expect(rate.source).toBe('employee_custom');
  });
});
