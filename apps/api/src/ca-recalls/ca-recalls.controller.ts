import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { CaRecallsResponseDto } from './ca-recalls.dto.js'
import { CaRecallsService } from './ca-recalls.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100).optional()
})

@ApiTags('ca-recalls')
@Controller('api/ca')
export class CaRecallsController {
  constructor(@Inject(CaRecallsService) private readonly caRecallsService: CaRecallsService) {}

  /** Canadian recall campaigns with no US twin (Transport Canada, OGL) — never a statement about a particular car. */
  @Get('recalls')
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: CaRecallsResponseDto })
  recalls(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<CaRecallsResponseDto> {
    return this.caRecallsService.recalls(query.brand, query.model, query.year)
  }
}
