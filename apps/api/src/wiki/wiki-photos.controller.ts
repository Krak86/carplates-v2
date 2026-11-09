import { Controller, Get, Inject, Query, UseInterceptors } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { VEHICLE_COLORS } from '@carplates/shared'
import { z } from 'zod'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { WIKI_RECOLOR_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { WikiPhotosDto } from './wiki.dto.js'
import { WikiPhotosService } from './wiki-photos.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  color: z.enum(VEHICLE_COLORS).optional()
})

@ApiTags('wiki')
@Controller('api/wiki')
@Throttle(WIKI_RECOLOR_THROTTLE)
export class WikiPhotosController {
  constructor(@Inject(WikiPhotosService) private readonly photos: WikiPhotosService) {}

  @Get('photos')
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'color', required: false, enum: VEHICLE_COLORS })
  @ApiOkResponse({ type: WikiPhotosDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<WikiPhotosDto> {
    return this.photos.lookup(query.brand, query.model, query.year ?? null, query.color ?? null)
  }
}
