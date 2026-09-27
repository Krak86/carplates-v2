import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { VEHICLE_COLORS, VEHICLE_FUELS, VEHICLE_KINDS } from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { BrandSuggestionsDto, ModelSuggestionsDto, SearchResponseDto } from './search.dto.js'
import { SearchService } from './search.service.js'

// Below this, pg_trgm's GIN index (packages/db/migrations 0013/0014) can't accelerate an ILIKE
// substring match -- a 1-2 char pattern isn't a real trigram, so Postgres would fall back to a
// sequential scan over the 15M+ row table. Same floor applies client-side (see
// use-advanced-search-actions.ts's MIN_TEXT_FILTER_LENGTH) so this is defense in depth, not the
// only gate.
const MIN_TEXT_QUERY_LENGTH = 3
const freeTextQuery = z
  .string()
  .trim()
  .refine(v => v.length === 0 || v.length >= MIN_TEXT_QUERY_LENGTH, {
    message: `must be empty or at least ${MIN_TEXT_QUERY_LENGTH} characters`
  })
// A positive 4-digit model year (1000-9999) -- matches the client's YEAR_RE.
const yearParam = z.coerce.number().int().min(1000).max(9999)

const brandsQuerySchema = z.object({ q: freeTextQuery.optional().default('') })

const modelsQuerySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  q: freeTextQuery.optional().default('')
})

const searchQuerySchema = z.object({
  brand: z.string().trim().min(MIN_TEXT_QUERY_LENGTH).optional(),
  model: z.string().trim().min(MIN_TEXT_QUERY_LENGTH).optional(),
  yearFrom: yearParam.optional(),
  yearTo: yearParam.optional(),
  fuel: z.enum(VEHICLE_FUELS).optional(),
  color: z.enum(VEHICLE_COLORS).optional(),
  kind: z.enum(VEHICLE_KINDS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
})

@ApiTags('search')
@Controller('api/search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get('brands')
  @ApiQuery({ name: 'q', required: false })
  @ApiOkResponse({ type: BrandSuggestionsDto })
  suggestBrands(
    @Query(zodParam(brandsQuerySchema)) query: z.infer<typeof brandsQuerySchema>
  ): Promise<BrandSuggestionsDto> {
    return this.searchService.suggestBrands(query.q)
  }

  @Get('models')
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiOkResponse({ type: ModelSuggestionsDto })
  suggestModels(
    @Query(zodParam(modelsQuerySchema)) query: z.infer<typeof modelsQuerySchema>
  ): Promise<ModelSuggestionsDto> {
    return this.searchService.suggestModels(query.brand, query.q)
  }

  @Get()
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'yearFrom', required: false })
  @ApiQuery({ name: 'yearTo', required: false })
  @ApiQuery({ name: 'fuel', required: false, enum: VEHICLE_FUELS })
  @ApiQuery({ name: 'color', required: false, enum: VEHICLE_COLORS })
  @ApiQuery({ name: 'kind', required: false, enum: VEHICLE_KINDS })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiOkResponse({ type: SearchResponseDto })
  search(@Query(zodParam(searchQuerySchema)) query: z.infer<typeof searchQuerySchema>): Promise<SearchResponseDto> {
    return this.searchService.search(query)
  }
}
