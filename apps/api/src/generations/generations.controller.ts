import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { GenerationGrowthResponseDto, GenerationsResponseDto } from './generations.dto.js'
import { GenerationsService } from './generations.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100).optional()
})

const growthQuerySchema = querySchema.omit({ year: true })

@ApiTags('generations')
@Controller('api/generations')
export class GenerationsController {
  constructor(@Inject(GenerationsService) private readonly generationsService: GenerationsService) {}

  /** The generation (code, production years) of a model-year, with its neighbours — Wikidata + Wikipedia facts. */
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: GenerationsResponseDto })
  generations(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<GenerationsResponseDto> {
    return this.generationsService.generations(query.brand, query.model, query.year)
  }

  /** All generations of a model with their typical length / width / wheelbase — behind the /read/generations guide. */
  @Get('growth')
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiOkResponse({ type: GenerationGrowthResponseDto })
  growth(
    @Query(zodParam(growthQuerySchema)) query: z.infer<typeof growthQuerySchema>
  ): Promise<GenerationGrowthResponseDto> {
    return this.generationsService.growth(query.brand, query.model)
  }
}
