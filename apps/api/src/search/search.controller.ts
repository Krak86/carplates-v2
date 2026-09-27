import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { VEHICLE_COLORS, VEHICLE_FUELS, VEHICLE_KINDS } from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { BrandSuggestionsDto, ModelSuggestionsDto, SearchResponseDto } from './search.dto.js'
import { SearchService } from './search.service.js'

const brandsQuerySchema = z.object({ q: z.string().trim().optional().default('') })

const modelsQuerySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  q: z.string().trim().optional().default('')
})

const searchQuerySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
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
