import { Module } from '@nestjs/common'

import { CarapisProvider } from './carapis.provider.js'
import { MarketController } from './market.controller.js'
import { MARKET_PROVIDER, MARKET_STORE } from './market-provider.js'
import { MarketRepository } from './market.repository.js'
import { MarketService } from './market.service.js'

@Module({
  controllers: [MarketController],
  providers: [
    MarketService,
    MarketRepository,
    CarapisProvider,
    { provide: MARKET_PROVIDER, useExisting: CarapisProvider },
    { provide: MARKET_STORE, useExisting: MarketRepository }
  ],
  exports: [MarketService]
})
export class MarketModule {}
