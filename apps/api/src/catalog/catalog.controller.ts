import { Controller, Get, Inject, NotFoundException, Param, Query, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { catalogLookupQuerySchema, catalogMakeParamsSchema, catalogParamsSchema } from '@carplates/shared'
import type { CatalogLookupQuery, CatalogMakeParams, CatalogParams } from '@carplates/shared'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { CATALOG_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import {
  CatalogLookupDto,
  CatalogMakeDto,
  CatalogMakesDto,
  CatalogModelDto,
  CatalogYearStatsDto
} from './catalog.dto.js'
import { CatalogService } from './catalog.service.js'

@ApiTags('catalog')
@Controller('api/catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  /** Which catalog page (if any) a plate or VIN card's brand + model belongs to; the card links only when one exists. */
  @Get('lookup')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: CatalogLookupDto })
  lookup(@Query(zodParam(catalogLookupQuerySchema)) query: CatalogLookupQuery): Promise<CatalogLookupDto> {
    return this.catalog.lookup(query.brand, query.model)
  }

  /** Every make with its car count: the `/cars` index. */
  @Get('makes')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: CatalogMakesDto })
  async makes(): Promise<CatalogMakesDto> {
    return { makes: await this.catalog.makes() }
  }

  /** One make and its model pages: `/cars/:make`. */
  @Get(':make')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: CatalogMakeDto })
  @ApiNotFoundResponse({ description: 'No catalog page for this make' })
  async make(@Param(zodParam(catalogMakeParamsSchema)) params: CatalogMakeParams): Promise<CatalogMakeDto> {
    const found = await this.catalog.make(params.make)
    if (!found) throw new NotFoundException()
    return found
  }

  /** Per make year fuel / body / colour / region counts of one model: the input of the generation stats. */
  @Get(':make/:model/years')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: CatalogYearStatsDto })
  @ApiNotFoundResponse({ description: 'No catalog page for this make/model' })
  async years(@Param(zodParam(catalogParamsSchema)) params: CatalogParams): Promise<CatalogYearStatsDto> {
    const found = await this.catalog.byYear(params.make, params.model)
    if (!found) throw new NotFoundException()
    return found
  }

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
