import { Module } from '@nestjs/common'

import { FuelController } from './fuel.controller.js'
import { FuelService } from './fuel.service.js'
import { FuelStatsService } from './fuel-stats.service.js'
import { PowertrainStatsService } from './powertrain-stats.service.js'

@Module({
  controllers: [FuelController],
  providers: [FuelService, FuelStatsService, PowertrainStatsService],
  exports: [FuelStatsService]
})
export class FuelModule {}
