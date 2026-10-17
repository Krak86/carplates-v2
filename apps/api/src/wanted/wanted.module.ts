import { Module } from '@nestjs/common'

import { WantedController } from './wanted.controller.js'
import { WantedService } from './wanted.service.js'
import { WantedStatsService } from './wanted-stats.service.js'

@Module({
  controllers: [WantedController],
  providers: [WantedService, WantedStatsService]
})
export class WantedModule {}
