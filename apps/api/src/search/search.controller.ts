import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  MIN_BRAND_LENGTH,
  MIN_INDEXABLE_LENGTH,
  MIN_MODEL_LENGTH,
  REGION_NAMES,
  textFilterError,
  VEHICLE_COLORS,
  VEHICLE_FUELS,
  VEHICLE_KINDS
} from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { BodySuggestionsDto, BrandSuggestionsDto, ModelSuggestionsDto, SearchResponseDto } from './search.dto.js'
import { SearchService } from './search.service.js'

// Floors live in @carplates/shared (searchFilters.ts) -- the web form applies the same rules, so this is
// defense in depth, not the only gate. Suggestions hit the small stats_* rollups, so 2 chars is plenty.
const MIN_SUGGEST_LENGTH = 2
const freeTextQuery = z
  .string()
  .trim()
  .refine(v => v.length === 0 || v.length >= MIN_SUGGEST_LENGTH, {
    message: `must be empty or at least ${MIN_SUGGEST_LENGTH} characters`
  })
// A positive 4-digit model year (1000-9999) -- matches the client's YEAR_RE.
const yearParam = z.coerce.number().int().min(1000).max(9999)

const brandsQuerySchema = z.object({ q: freeTextQuery.optional().default('') })

const bodiesQuerySchema = z.object({ q: freeTextQuery.optional().default('') })

const modelsQuerySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  q: freeTextQuery.optional().default('')
})

const searchQuerySchema = z
  .object({
    brand: z.string().trim().min(MIN_BRAND_LENGTH).optional(),
    model: z.string().trim().min(MIN_MODEL_LENGTH).optional(),
    yearFrom: yearParam.optional(),
    yearTo: yearParam.optional(),
    fuel: z.enum(VEHICLE_FUELS).optional(),
    color: z.enum(VEHICLE_COLORS).optional(),
    kind: z.enum(VEHICLE_KINDS).optional(),
    body: z.string().trim().min(MIN_INDEXABLE_LENGTH).optional(),
    region: z
      .string()
      .trim()
      .min(1)
      .optional()
      .refine(v => v === undefined || REGION_NAMES.includes(v), { message: 'unknown region' }),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20)
  })
  .refine(q => textFilterError(q.brand ?? '', q.model ?? '') === null, {
    message: 'a short make/model needs the other field to have at least 3 characters'
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

  @Get('bodies')
  @ApiQuery({ name: 'q', required: false })
  @ApiOkResponse({ type: BodySuggestionsDto })
  suggestBodies(
    @Query(zodParam(bodiesQuerySchema)) query: z.infer<typeof bodiesQuerySchema>
  ): Promise<BodySuggestionsDto> {
    return this.searchService.suggestBodies(query.q)
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
  @ApiQuery({ name: 'body', required: false })
  @ApiQuery({ name: 'region', required: false, enum: REGION_NAMES })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiOkResponse({ type: SearchResponseDto })
  search(@Query(zodParam(searchQuerySchema)) query: z.infer<typeof searchQuerySchema>): Promise<SearchResponseDto> {
    return this.searchService.search(query)
  }
}
