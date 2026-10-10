import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { FuelEconomyDto, FuelStatsDto, PowertrainStatsDto } from './fuel.dto.js'
import { FuelService } from './fuel.service.js'
import { FuelStatsService } from './fuel-stats.service.js'
import { PowertrainStatsService } from './powertrain-stats.service.js'

const querySchema = z.object({
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
  fuel: z.string().trim().optional(),
  capacity: z.coerce.number().int().min(0).max(20000).optional()
})

@ApiTags('fuel')
@Controller('api/fuel')
export class FuelController {
  constructor(
    @Inject(FuelService) private readonly fuelService: FuelService,
    @Inject(FuelStatsService) private readonly fuelStatsService: FuelStatsService,
    @Inject(PowertrainStatsService) private readonly powertrainStatsService: PowertrainStatsService
  ) {}

  // Persisted reference data (pnpm ingest:fuel), not proxied live — see fuel.service.ts.
  @Get()
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'fuel', required: false })
  @ApiQuery({ name: 'capacity', required: false })
  @ApiOkResponse({ type: FuelEconomyDto })
  estimate(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<FuelEconomyDto> {
    return this.fuelService.estimate(query)
  }

  // Rollup for the /fuel page, rebuilt by `pnpm db:refresh-fuel-stats` — see fuel-stats.service.ts.
  @Get('stats')
  @ApiOkResponse({ type: FuelStatsDto })
  stats(): Promise<FuelStatsDto> {
    return this.fuelStatsService.get()
  }

  // Fuel-class breakdown (counts, shares, top/rare models and brands) from the same rollup table.
  @Get('powertrains')
  @ApiOkResponse({ type: PowertrainStatsDto })
  powertrains(): Promise<PowertrainStatsDto> {
    return this.powertrainStatsService.get()
  }
}
