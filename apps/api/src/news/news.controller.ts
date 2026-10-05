import { Controller, Get, Header, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { NewsDto } from './news.dto.js'
import { NewsService } from './news.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  lang: z.enum(['uk', 'ru', 'en']).optional()
})

@ApiTags('news')
@Controller('api/news')
export class NewsController {
  constructor(@Inject(NewsService) private readonly newsService: NewsService) {}

  // Polled RSS headlines (pnpm ingest:news), not proxied live. Without `brand`: the latest news overall (homepage);
  // with it: that car's model news, then brand news — an unknown / newsless brand gives an empty list.
  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'lang', required: false, enum: ['uk', 'ru', 'en'] })
  @ApiOkResponse({ type: NewsDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<NewsDto> {
    return this.newsService.lookup(query)
  }
}
