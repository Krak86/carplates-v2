import { Controller, Get, Inject, NotFoundException, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { DreamSummaryResponse } from '@carplates/shared'

import { lookupCacheInterceptor, STATS_CACHE } from '../common/cache.js'
import { DREAM_THROTTLE } from '../common/throttle.js'

import { DreamService } from './dream.service.js'

/**
 * DREAM recovery projects (dream.gov.ua) summarized per region from our own copy. Changes once a day (the ingest cron):
 * edge-cached like the stats rollups. Not in `PUBLIC_API_PATH_PREFIXES`; add the path to the Cloudflare Cache Rule.
 */
@ApiTags('dream')
@Controller('api/dream')
@Throttle(DREAM_THROTTLE)
@UseInterceptors(lookupCacheInterceptor(STATS_CACHE))
export class DreamController {
  constructor(@Inject(DreamService) private readonly dream: DreamService) {}

  @Get('summary')
  @ApiNotFoundResponse({ description: 'Nothing stored yet' })
  async summary(): Promise<DreamSummaryResponse> {
    const result = await this.dream.summary()
    if (!result) throw new NotFoundException('no recovery projects stored yet')
    return result
  }
}
