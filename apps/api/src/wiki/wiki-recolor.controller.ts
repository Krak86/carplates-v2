import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  StreamableFile,
  UseInterceptors
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { LOOKUP_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { WIKI_RECOLOR_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { WikiRecolorDto } from './wiki.dto.js'
import { WikiRecolorService } from './wiki-recolor.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100).optional()
})

/** The mask is keyed by the photo URL and its URL carries `?v=algo`, so a copy never goes stale. */
const MASK_CACHE = 'public, max-age=31536000, immutable'

@ApiTags('wiki')
@Controller('api/wiki')
@Throttle(WIKI_RECOLOR_THROTTLE)
export class WikiRecolorController {
  constructor(@Inject(WikiRecolorService) private readonly recolor: WikiRecolorService) {}

  @Get('recolor')
  @UseInterceptors(lookupCacheInterceptor(LOOKUP_CACHE))
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: WikiRecolorDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<WikiRecolorDto> {
    return this.recolor.lookup(query.brand, query.model, query.year ?? null)
  }

  // No `@Header`: a header decorator is also sent with error responses, and Fastify refuses the JSON error body under
  // `image/webp` (a 500) that the edge would then keep for a year. The interceptor sets cache-control on success only.
  @Get('paint/:file')
  @UseInterceptors(lookupCacheInterceptor(MASK_CACHE))
  async mask(
    @Param('file', zodParam(z.string().regex(/^[0-9a-f]{32}.webp$/, 'Bad mask id'))) file: string
  ): Promise<StreamableFile> {
    const mask = await this.recolor.mask(file.slice(0, 32))
    if (!mask) throw new NotFoundException('No mask')
    return new StreamableFile(mask, { type: 'image/webp' })
  }
}
