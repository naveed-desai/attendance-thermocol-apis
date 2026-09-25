import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DailyRateOverride,
  DailyRateOverrideDocument,
} from '../schemas/daily-rate-override.schema.js';
import { CreateDailyRateOverrideDto } from './dto/create-override.dto.js';

export interface ResolvedRate {
  date: string;
  dayOfWeek: string;
  isSunday: boolean;
  baseRate8h: number;
  bonus8h: number;
  rate8h: number;
  hourlyRate: number;
  source: 'override' | 'employee_custom' | 'standard_default';
  reason?: string;
}

@Injectable()
export class RatesService {
  public static readonly STANDARD_RATE = 240;

  constructor(
    @InjectModel(DailyRateOverride.name)
    private readonly overrideModel: Model<DailyRateOverrideDocument>,
  ) {}

  getDayInfo(dateStr: string): { dayOfWeek: string; isSunday: boolean } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayOfWeekNum = dateObj.getDay();
    const dayOfWeek = days[dayOfWeekNum];
    const isSunday = dayOfWeekNum === 0;
    return { dayOfWeek, isSunday };
  }

  async resolveRate(
    dateStr: string,
    customDailyRate?: number,
  ): Promise<ResolvedRate> {
    const { dayOfWeek, isSunday } = this.getDayInfo(dateStr);

    // 1. Determine employee base daily rate (default 240 if not set)
    const isCustom = typeof customDailyRate === 'number' && customDailyRate > 0;
    const baseRate8h = isCustom ? customDailyRate : RatesService.STANDARD_RATE;
    const baseSource: 'employee_custom' | 'standard_default' = isCustom
      ? 'employee_custom'
      : 'standard_default';

    // 2. Check for date-specific bonus / increment set by Admin
    const override = await this.overrideModel.findOne({ date: dateStr }).exec();
    let bonus8h = 0;
    let reason: string | undefined;
    let source: 'override' | 'employee_custom' | 'standard_default' = baseSource;

    if (override) {
      if (override.bonus8h !== undefined && override.bonus8h !== null) {
        bonus8h = override.bonus8h;
      } else if (override.rate8h !== undefined && override.rate8h !== null) {
        bonus8h = Math.max(0, override.rate8h - RatesService.STANDARD_RATE);
      }
      reason = override.reason;
      if (bonus8h > 0 || override.rate8h !== undefined) {
        source = 'override';
      }
    }

    // 3. Effective rate is base rate + date bonus (applied equally to all days, including Sundays)
    const effectiveRate8h = baseRate8h + bonus8h;

    return {
      date: dateStr,
      dayOfWeek,
      isSunday,
      baseRate8h,
      bonus8h,
      rate8h: effectiveRate8h,
      hourlyRate: effectiveRate8h / 8,
      source,
      reason,
    };
  }

  async setOverride(
    dto: CreateDailyRateOverrideDto,
    adminName?: string,
  ): Promise<DailyRateOverride> {
    const bonus8h =
      dto.bonus8h !== undefined
        ? dto.bonus8h
        : dto.rate8h !== undefined
          ? Math.max(0, dto.rate8h - RatesService.STANDARD_RATE)
          : 0;
    const rate8h =
      dto.rate8h !== undefined
        ? dto.rate8h
        : RatesService.STANDARD_RATE + bonus8h;

    return this.overrideModel
      .findOneAndUpdate(
        { date: dto.date },
        {
          date: dto.date,
          bonus8h,
          rate8h,
          reason: dto.reason,
          setBy: adminName ?? 'admin',
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async getOverrides(): Promise<DailyRateOverride[]> {
    return this.overrideModel.find().sort({ date: -1 }).exec();
  }

  async deleteOverride(date: string): Promise<{ success: boolean; date: string }> {
    const result = await this.overrideModel.findOneAndDelete({ date }).exec();
    if (!result) {
      throw new NotFoundException(`No rate override found for date: ${date}`);
    }
    return { success: true, date };
  }
}
