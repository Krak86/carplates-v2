import { Controller, Get, Header, Inject, Param, Query, StreamableFile, UseInterceptors } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AUCTION_SOURCES, auctionListQuerySchema, isVin, normalizePlate } from '@carplates/shared'
import type { AuctionListParams } from '@carplates/shared'
import { z } from 'zod'

import { PHOTO_CACHE, ROLLUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { PHOTO_THROTTLE, PLATE_LOOKUP_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { AuctionListResponseDto, AuctionResponseDto, AuctionStatsResponseDto } from './auctions.dto.js'
import { AuctionsService } from './auctions.service.js'
import { photoParamSchema, photoQuerySchema } from './photo.schema.js'
import { PhotoService } from './photo.service.js'
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

const statsQuerySchema = z.object({ source: z.enum(AUCTION_SOURCES).optional() })

@ApiTags('auctions')
@Controller('api/auctions')
export class AuctionsController {
  constructor(
    @Inject(AuctionsService) private readonly auctionsService: AuctionsService,
    @Inject(AuctionsStatsService) private readonly statsService: AuctionsStatsService,
    @Inject(PhotoService) private readonly photoService: PhotoService
  ) {}

  /** Aggregates over every stored lot of both sources (or `?source=setam|prozorro`), for the `/auctions` page. */
  @Get('stats')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiQuery({ name: 'source', required: false, enum: AUCTION_SOURCES })
  @ApiOkResponse({ type: AuctionStatsResponseDto })
  stats(@Query(zodParam(statsQuerySchema)) query: z.infer<typeof statsQuerySchema>): Promise<AuctionStatsResponseDto> {
    return this.statsService.stats(query.source)
  }

  /**
   * A Prozorro.Sale auction photo as WebP of `?w=` (320 | 960 | 1600) px. The id is the 32-hex document id: the upstream host is fixed.
   * Edge-cached for a year, 404 for anything that is not a small enough image (the web then shows the original or hides the image).
   */
  @Get('photo/:docId')
  @Throttle(PHOTO_THROTTLE)
  // Not `@Header`: a static header is also sent with an error (a 404 must never be cached for a year, and `image/webp` breaks the JSON body).
  @UseInterceptors(lookupCacheInterceptor(PHOTO_CACHE))
  async photo(
    @Param(zodParam(photoParamSchema)) params: z.infer<typeof photoParamSchema>,
    @Query(zodParam(photoQuerySchema)) query: z.infer<typeof photoQuerySchema>
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.photoService.resize(params.docId, query.w), { type: 'image/webp' })
  }

  /** One page of the public lot list (filters, sort), for the `/auctions` page. */
  @Get('lots')
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiOkResponse({ type: AuctionListResponseDto })
  lots(@Query(zodParam(auctionListQuerySchema)) query: AuctionListParams): Promise<AuctionListResponseDto> {
    return this.statsService.list(query)
  }

  /** Lots of both sources (SETAM seized property, Prozorro.Sale) that name this plate / VIN, newest first. */
  @Get()
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiQuery({ name: 'plate', required: false })
  @ApiQuery({ name: 'vin', required: false })
  @ApiOkResponse({ type: AuctionResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<AuctionResponseDto> {
    return this.auctionsService.lookup(query.plate, query.vin)
  }
}
