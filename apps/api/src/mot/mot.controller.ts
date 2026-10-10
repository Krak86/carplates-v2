import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { motResponseSchema } from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { MotService } from './mot.service.js'

class MotResponseDto extends createZodDto(motResponseSchema) {}

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  kind: z.string().trim().optional()
})

@ApiTags('mot')
@Controller('api/mot')
export class MotController {
  constructor(@Inject(MotService) private readonly motService: MotService) {}

  /** UK MOT statistics (DVSA anonymised results, OGL v3) for a registry make/model: fail and advisory rates by mileage. */
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'kind', required: false })
  @ApiOkResponse({ type: MotResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<MotResponseDto> {
    return this.motService.lookup(query.brand, query.model, query.year ?? null, query.kind)
  }
}
