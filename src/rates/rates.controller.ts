import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RatesService } from './rates.service.js';
import { CreateDailyRateOverrideDto } from './dto/create-override.dto.js';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get('resolve')
  async resolveRate(
    @Query('date') date: string,
    @Query('customRate') customRate?: string,
  ) {
    const todayStr =
      date || new Date().toISOString().split('T')[0];
    const parsedCustomRate = customRate ? parseFloat(customRate) : undefined;
    return this.ratesService.resolveRate(todayStr, parsedCustomRate);
  }

  @Get('overrides')
  async getOverrides() {
    return this.ratesService.getOverrides();
  }

  @Post('overrides')
  async setOverride(@Body() dto: CreateDailyRateOverrideDto) {
    return this.ratesService.setOverride(dto);
  }

  @Delete('overrides/:date')
  async deleteOverride(@Param('date') date: string) {
    return this.ratesService.deleteOverride(date);
  }
}
