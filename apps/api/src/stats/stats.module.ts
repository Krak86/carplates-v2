import { Module } from '@nestjs/common'

import { FuelModule } from '../fuel/fuel.module.js'
import { SafetyModule } from '../safety/safety.module.js'

import { StatsController } from './stats.controller.js'
import { StatsService } from './stats.service.js'

@Module({
  imports: [FuelModule, SafetyModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService]
})
export class StatsModule {}
