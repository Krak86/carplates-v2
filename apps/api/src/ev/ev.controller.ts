import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { openEvResponseSchema } from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { EvService } from './ev.service.js'

class OpenEvResponseDto extends createZodDto(openEvResponseSchema) {}

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1)
})

@ApiTags('ev')
@Controller('api/ev')
export class EvController {
  constructor(@Inject(EvService) private readonly evService: EvService) {}

  /** Battery, consumption and charging of the electric variants Open EV Data lists for a make/model (MIT). */
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiOkResponse({ type: OpenEvResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<OpenEvResponseDto> {
    return this.evService.lookup(query.brand, query.model)
  }
}
