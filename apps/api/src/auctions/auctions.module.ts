import { Module } from '@nestjs/common'

import { AuctionsController } from './auctions.controller.js'
import { AuctionsService } from './auctions.service.js'
import { AuctionsStatsService } from './auctions-stats.service.js'

@Module({
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsStatsService],
  exports: [AuctionsService]
})
export class AuctionsModule {}
