import { Controller, Get, Header, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { auctionListQuerySchema, isVin, normalizePlate } from '@carplates/shared'
import type { AuctionListParams } from '@carplates/shared'
import { z } from 'zod'

import { ROLLUP_CACHE } from '../common/cache.js'
import { PLATE_LOOKUP_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { AuctionListResponseDto, AuctionResponseDto, AuctionStatsResponseDto } from './auctions.dto.js'
import { AuctionsService } from './auctions.service.js'
import { AuctionsStatsService } from './auctions-stats.service.js'

const querySchema = z
  .object({
    plate: z.string().trim().min(1).max(20).optional(),
    vin: z.string().trim().min(11).max(20).optional()
  })
  .refine(q => !!q.plate || !!q.vin, { message: 'plate or vin is required' })
  .transform(q => ({
    plate: q.plate ? normalizePlate(q.plate) : null,
    vin: q.vin && isVin(q.vin) ? q.vin.replace(/\s+/g, '').toUpperCase() : null
  }))

@ApiTags('auctions')
@Controller('api/auctions')
export class AuctionsController {
  constructor(
    @Inject(AuctionsService) private readonly auctionsService: AuctionsService,
    @Inject(AuctionsStatsService) private readonly statsService: AuctionsStatsService
  ) {}

  /** Aggregates over every stored lot, for the `/auctions` page. */
  @Get('stats')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({ type: AuctionStatsResponseDto })
  stats(): Promise<AuctionStatsResponseDto> {
    return this.statsService.stats()
  }

  /** One page of the public lot list (filters, sort), for the `/auctions` page. */
  @Get('lots')
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiOkResponse({ type: AuctionListResponseDto })
  lots(@Query(zodParam(auctionListQuerySchema)) query: AuctionListParams): Promise<AuctionListResponseDto> {
    return this.statsService.list(query)
  }

  /** SETAM auction lots (seized property) whose title named this plate / VIN, newest lot first. */
  @Get()
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiQuery({ name: 'plate', required: false })
  @ApiQuery({ name: 'vin', required: false })
  @ApiOkResponse({ type: AuctionResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<AuctionResponseDto> {
    return this.auctionsService.lookup(query.plate, query.vin)
  }
}
