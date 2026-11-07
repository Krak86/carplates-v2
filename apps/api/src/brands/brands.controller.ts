import { Controller, Get, Inject, NotFoundException, Param, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { brandPronunciationParamsSchema } from '@carplates/shared'
import type { BrandPronunciationParams } from '@carplates/shared'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { CATALOG_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { BrandPronunciationDto } from './brands.dto.js'
import { BrandsService } from './brands.service.js'

@ApiTags('brands')
@Controller('api/brands')
export class BrandsController {
  constructor(@Inject(BrandsService) private readonly brands: BrandsService) {}

  /** How a make's name is said and written in ua / ru / en, plus an optional audio clip: the speaker popover on catalog pages. */
  @Get(':slug/pronunciation')
  @Throttle(CATALOG_THROTTLE)
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiOkResponse({ type: BrandPronunciationDto })
  @ApiNotFoundResponse({ description: 'No pronunciation for this make' })
  async pronunciation(
    @Param(zodParam(brandPronunciationParamsSchema)) params: BrandPronunciationParams
  ): Promise<BrandPronunciationDto> {
    const found = await this.brands.pronunciation(params.slug)
    if (!found) throw new NotFoundException()
    return found
  }
}
