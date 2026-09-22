import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DailyRateOverride,
  DailyRateOverrideSchema,
} from '../schemas/daily-rate-override.schema.js';
import { RatesService } from './rates.service.js';
import { RatesController } from './rates.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyRateOverride.name, schema: DailyRateOverrideSchema },
    ]),
  ],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
