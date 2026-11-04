import { Controller, Get, Inject, NotFoundException, Query, UseInterceptors } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { SHOWROOM_FILTERS } from '@carplates/shared'
import { z } from 'zod'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { SHOWROOM_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { ShowroomDetailDto, ShowroomListDto } from './showroom.dto.js'
import { ShowroomService } from './showroom.service.js'

const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  kind: z.enum(SHOWROOM_FILTERS).default('all'),
  offset: z.coerce.number().int().min(0).max(100_000).default(0)
})

const detailSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80)
})

@ApiTags('showroom')
@Controller('api/showroom')
export class ShowroomController {
  constructor(@Inject(ShowroomService) private readonly showroomService: ShowroomService) {}

  // Every make/model with a 360, 3D or 3DTuning view. Keyed on the search text only (no plate or VIN), so the edge may cache it.
  @Get()
  @Throttle(SHOWROOM_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'kind', required: false, enum: SHOWROOM_FILTERS })
  @ApiQuery({ name: 'offset', required: false })
  @ApiOkResponse({ type: ShowroomListDto })
  list(@Query(zodParam(listSchema)) query: z.infer<typeof listSchema>): Promise<ShowroomListDto> {
    return this.showroomService.list(query)
  }

  // What one list entry opens, addressed by the brand/model slugs the list returned.
  @Get('detail')
  @Throttle(SHOWROOM_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiOkResponse({ type: ShowroomDetailDto })
  async detail(@Query(zodParam(detailSchema)) query: z.infer<typeof detailSchema>): Promise<ShowroomDetailDto> {
    const detail = await this.showroomService.detail(query.brand, query.model)
    if (!detail) throw new NotFoundException()
    return detail
  }
}
