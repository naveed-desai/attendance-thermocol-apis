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

  it('should identify Sunday and apply Sunday default rate (₹250)', async () => {
    // 2026-09-20 is Sunday
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    const rate = await service.resolveRate('2026-09-20');
    expect(rate.isSunday).toBe(true);
    expect(rate.dayOfWeek).toBe('Sunday');
    expect(rate.rate8h).toBe(250);
    expect(rate.hourlyRate).toBe(31.25);
    expect(rate.source).toBe('sunday_default');
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

  it('should prioritize Admin date override when present', async () => {
    // 2026-09-21 is Monday, but overridden to ₹300
    mockOverrideModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        date: '2026-09-21',
        rate8h: 300,
        reason: 'Festival Special',
      }),
    });

    const rate = await service.resolveRate('2026-09-21');
    expect(rate.rate8h).toBe(300);
    expect(rate.hourlyRate).toBe(37.5);
    expect(rate.source).toBe('override');
    expect(rate.reason).toBe('Festival Special');
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
