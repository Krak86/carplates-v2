import { Controller, Get, Header, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { NewsDto, NewsPageDto } from './news.dto.js'
import { NewsService } from './news.service.js'

const pageQuerySchema = z.object({
  // Comma-separated source ids (`scripts/news-sources.json`), e.g. `eauto,mezha`.
  source: z
    .string()
    .trim()
    .optional()
    .transform(v => (v ? v.split(',').filter(Boolean).slice(0, 20) : undefined)),
  // Min 3 chars, mirrored by NEWS_SEARCH_MIN_CHARS in apps/web/src/lib/news.ts.
  q: z.string().trim().min(3).max(100).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  lang: z.enum(['uk', 'ru', 'en']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
})

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

  // Paginated archive for the /news page. Declared before the bare `GET /api/news` only for readability — paths differ.
  @Get('list')
  @Header('Cache-Control', 'public, max-age=600')
  @ApiQuery({ name: 'source', required: false, description: 'Comma-separated source ids' })
  @ApiQuery({ name: 'lang', required: false, enum: ['uk', 'ru', 'en'] })
  @ApiQuery({ name: 'q', required: false, description: 'Title substring' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiOkResponse({ type: NewsPageDto })
  list(@Query(zodParam(pageQuerySchema)) query: z.infer<typeof pageQuerySchema>): Promise<NewsPageDto> {
    return this.newsService.list({ ...query, sources: query.source })
  }

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
