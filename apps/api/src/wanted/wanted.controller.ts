import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { isVin, normalizePlate } from '@carplates/shared'
import { z } from 'zod'

import { PLATE_LOOKUP_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { WantedResponseDto, WantedStatsResponseDto } from './wanted.dto.js'
import { WantedService } from './wanted.service.js'
import { WantedStatsService } from './wanted-stats.service.js'

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

@ApiTags('wanted')
@Controller('api/wanted')
export class WantedController {
  constructor(
    @Inject(WantedService) private readonly wantedService: WantedService,
    @Inject(WantedStatsService) private readonly statsService: WantedStatsService
  ) {}

  /** Aggregates over the whole wanted list and scraped history, for the `/wanted` page. */
  @Get('stats')
  @ApiOkResponse({ type: WantedStatsResponseDto })
  stats(): Promise<WantedStatsResponseDto> {
    return this.statsService.stats()
  }

  /** Is the plate / VIN on the National Police list of vehicles wanted for unlawful taking, now or earlier. */
  @Get()
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiQuery({ name: 'plate', required: false })
  @ApiQuery({ name: 'vin', required: false })
  @ApiOkResponse({ type: WantedResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<WantedResponseDto> {
    return this.wantedService.lookup(query.plate, query.vin)
  }
}
