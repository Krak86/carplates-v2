import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { NhtsaComplaintsResponseDto, NhtsaRecallsResponseDto } from './nhtsa.dto.js'
import { NhtsaService } from './nhtsa.service.js'

const querySchema = z.object({
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100)
})

@ApiTags('nhtsa')
@Controller('api/nhtsa')
export class NhtsaController {
  constructor(@Inject(NhtsaService) private readonly nhtsaService: NhtsaService) {}

  /** US recall campaigns for a model-year (live NHTSA API, 7-day cache) — never a statement about a particular car. */
  @Get('recalls')
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: NhtsaRecallsResponseDto })
  recalls(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<NhtsaRecallsResponseDto> {
    return this.nhtsaService.recalls(query.make, query.model, query.year)
  }

  /** Aggregated US owner complaints for a model-year (live NHTSA API, 30-day cache). */
  @Get('complaints')
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: NhtsaComplaintsResponseDto })
  complaints(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<NhtsaComplaintsResponseDto> {
    return this.nhtsaService.complaints(query.make, query.model, query.year)
  }
}
