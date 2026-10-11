import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { WikispecsResponseDto } from './wikispecs.dto.js'
import { WikispecsService } from './wikispecs.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100)
})

@ApiTags('wikispecs')
@Controller('api/wikispecs')
export class WikispecsController {
  constructor(@Inject(WikispecsService) private readonly wikispecsService: WikispecsService) {}

  /** Engines, layout and (where RDW has no row) dimensions of a model-year's generation — Wikipedia catalogue facts. */
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: WikispecsResponseDto })
  wikispecs(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<WikispecsResponseDto> {
    return this.wikispecsService.wikispecs(query.brand, query.model, query.year)
  }
}
