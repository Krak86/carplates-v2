import { Controller, Get, Inject, NotFoundException, Query, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { lossesHistoryQuerySchema } from '@carplates/shared'
import type { LossesHistoryQuery, LossesHistoryResponse, LossesResponse } from '@carplates/shared'

import { lookupCacheInterceptor, LOSSES_CACHE } from '../common/cache.js'
import { LOSSES_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { LossesService } from './losses.service.js'

/**
 * Russian war losses (General Staff approximate figures) from our own daily copy, not the upstream API. Changes once a day:
 * edge-cached like the stats rollups. Not in `PUBLIC_API_PATH_PREFIXES`; the Cloudflare Cache Rule lists both paths.
 */
@ApiTags('losses')
@Controller('api/losses')
@Throttle(LOSSES_THROTTLE)
@UseInterceptors(lookupCacheInterceptor(LOSSES_CACHE))
export class LossesController {
  constructor(@Inject(LossesService) private readonly losses: LossesService) {}

  @Get()
  @ApiNotFoundResponse({ description: 'Nothing stored yet' })
  async latest(): Promise<LossesResponse> {
    const result = await this.losses.latest()
    if (!result) throw new NotFoundException('no loss figures stored yet')
    return result
  }

  @Get('history')
  @ApiNotFoundResponse({ description: 'Nothing stored yet' })
  async history(@Query(zodParam(lossesHistoryQuerySchema)) query: LossesHistoryQuery): Promise<LossesHistoryResponse> {
    const result = await this.losses.history(query)
    if (!result) throw new NotFoundException('no loss figures stored yet')
    return result
  }
}
