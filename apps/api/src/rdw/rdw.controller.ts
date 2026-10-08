import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { RdwResponseDto } from './rdw.dto.js'
import { RdwService } from './rdw.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  /** Registry `kind` text (ЛЕГКОВИЙ, МОТОЦИКЛ, ВАНТАЖНИЙ, АВТОБУС …); omitted = passenger car. */
  kind: z.string().trim().min(1).optional()
})

@ApiTags('rdw')
@Controller('api/rdw')
export class RdwController {
  constructor(@Inject(RdwService) private readonly rdwService: RdwService) {}

  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'kind', required: false })
  @ApiOkResponse({ type: RdwResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<RdwResponseDto> {
    return this.rdwService.lookup(query.brand, query.model, query.year, query.kind)
  }
}
