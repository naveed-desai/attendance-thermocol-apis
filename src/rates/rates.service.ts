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
  rate8h: number;
  hourlyRate: number;
  source: 'override' | 'employee_custom' | 'sunday_default' | 'standard_default';
  reason?: string;
}

@Injectable()
export class RatesService {
  public static readonly STANDARD_RATE = 240;
  public static readonly SUNDAY_RATE = 250;

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

    // 1. Check for specific date override set by Admin
    const override = await this.overrideModel.findOne({ date: dateStr }).exec();
    if (override) {
      return {
        date: dateStr,
        dayOfWeek,
        isSunday,
        rate8h: override.rate8h,
        hourlyRate: override.rate8h / 8,
        source: 'override',
        reason: override.reason,
      };
    }

    // 2. Check for employee-specific custom rate
    if (customDailyRate && customDailyRate > 0) {
      return {
        date: dateStr,
        dayOfWeek,
        isSunday,
        rate8h: customDailyRate,
        hourlyRate: customDailyRate / 8,
        source: 'employee_custom',
      };
    }

    // 3. Sunday default (₹250)
    if (isSunday) {
      return {
        date: dateStr,
        dayOfWeek,
        isSunday,
        rate8h: RatesService.SUNDAY_RATE,
        hourlyRate: RatesService.SUNDAY_RATE / 8,
        source: 'sunday_default',
      };
    }

    // 4. Standard default (₹240)
    return {
      date: dateStr,
      dayOfWeek,
      isSunday,
      rate8h: RatesService.STANDARD_RATE,
      hourlyRate: RatesService.STANDARD_RATE / 8,
      source: 'standard_default',
    };
  }

  async setOverride(
    dto: CreateDailyRateOverrideDto,
    adminName?: string,
  ): Promise<DailyRateOverride> {
    return this.overrideModel
      .findOneAndUpdate(
        { date: dto.date },
        {
          date: dto.date,
          rate8h: dto.rate8h,
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
