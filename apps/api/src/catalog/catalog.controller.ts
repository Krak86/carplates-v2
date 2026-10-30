import { Controller, Get, Inject, NotFoundException, Param, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { catalogParamsSchema } from '@carplates/shared'
import type { CatalogParams } from '@carplates/shared'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { CATALOG_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { CatalogModelDto } from './catalog.dto.js'
import { CatalogService } from './catalog.service.js'

@ApiTags('catalog')
@Controller('api/catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  /** Registry rollup of one model (cars on the road, years, fuel, body, colours, regions) from the precomputed catalog tables. */
  @Get(':make/:model')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: CatalogModelDto })
  @ApiNotFoundResponse({ description: 'No catalog page for this make/model' })
  async model(@Param(zodParam(catalogParamsSchema)) params: CatalogParams): Promise<CatalogModelDto> {
    const found = await this.catalog.get(params.make, params.model)
    if (!found) throw new NotFoundException()
    return found
  }
}
