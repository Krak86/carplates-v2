import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { ORIGIN_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { OriginResponseDto } from './origin.dto.js'
import { OriginService } from './origin.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80).optional(),
  year: z.coerce.number().int().min(1880).max(2100).optional(),
  vin: z.string().trim().min(1).max(20).optional(),
  plantCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  plantCity: z.string().trim().min(1).max(80).optional()
})

@ApiTags('origin')
@Controller('api/origin')
export class OriginController {
  constructor(@Inject(OriginService) private readonly originService: OriginService) {}

  @Get()
  @Throttle(ORIGIN_THROTTLE)
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'vin', required: false })
  @ApiQuery({ name: 'plantCountry', required: false, description: 'ISO 3166-1 alpha-2 of the NHTSA plant country' })
  @ApiQuery({ name: 'plantCity', required: false })
  @ApiOkResponse({ type: OriginResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<OriginResponseDto> {
    return this.originService.lookup(query)
  }
}
