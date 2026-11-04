import { Controller, Get, Inject, Query, UseInterceptors } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { TUNING_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { TuningResponseDto } from './tuning.dto.js'
import { TuningService } from './tuning.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1880).max(2100),
  body: z.string().trim().min(1).max(80).optional()
})

@ApiTags('tuning')
@Controller('api/tuning')
export class TuningController {
  constructor(@Inject(TuningService) private readonly tuningService: TuningService) {}

  // The "Customize in 3D" link-out (3DTuning): keyed on brand/model/year/body, never on a plate or VIN, so the edge may cache it.
  @Get()
  @Throttle(TUNING_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({
    name: 'body',
    required: false,
    description: 'Registry body (`СЕДАН-B`); needed for models with several bodies'
  })
  @ApiOkResponse({ type: TuningResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<TuningResponseDto> {
    return this.tuningService.lookup(query)
  }
}
