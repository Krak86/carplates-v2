import { Controller, Get, HttpException, HttpStatus, Inject, Param, Query, Redirect } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { marketIdSchema, marketParamsSchema, marketQuerySchema } from '@carplates/shared'
import type { MarketDetail, MarketResponse } from '@carplates/shared'

import { MARKET_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { MarketService } from './market.service.js'

/**
 * "Cars for sale" (CarAPIS). Deliberately not in `PUBLIC_API_PATH_PREFIXES` nor the Cloudflare cache rule: the 100 requests
 * a day are guarded by our own Postgres cache, and an edge copy would hide the budget from the counter. Static routes first.
 */
@ApiTags('market')
@Controller('api/market')
export class MarketController {
  constructor(@Inject(MarketService) private readonly market: MarketService) {}

  @Get('vehicle/:id')
  @Throttle(MARKET_THROTTLE)
  detail(@Param('id', zodParam(marketIdSchema)) id: string): Promise<MarketDetail> {
    return this.market.detail(id)
  }

  /** A plain link target (`<a href target=_blank>`): 302 to the listing, 204 when it is unknown or the budget is spent. */
  @Get('go/:id')
  @Throttle(MARKET_THROTTLE)
  @Redirect()
  async go(@Param('id', zodParam(marketIdSchema)) id: string): Promise<{ url: string; statusCode: number }> {
    const url = await this.market.listingUrl(id)
    if (!url) throw new HttpException('No link', HttpStatus.NO_CONTENT)
    return { url, statusCode: HttpStatus.FOUND }
  }

  @Get(':make/:model')
  @Throttle(MARKET_THROTTLE)
  list(
    @Param(zodParam(marketParamsSchema)) params: { make: string; model: string },
    @Query(zodParam(marketQuerySchema)) query: { kind: 'passenger' | 'truck' | 'bus' }
  ): Promise<MarketResponse> {
    return this.market.list(params.make, params.model, query.kind)
  }
}
