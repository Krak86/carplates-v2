import { Module } from '@nestjs/common'

import { VdbController } from './vdb.controller.js'
import { VdbService } from './vdb.service.js'
import { VdbStatsService } from './vdb-stats.service.js'

@Module({
  controllers: [VdbController],
  providers: [VdbService, VdbStatsService],
  exports: [VdbService]
})
export class VdbModule {}
