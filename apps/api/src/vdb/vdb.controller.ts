import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { VDB_VEHICLE_CLASSES } from '@carplates/shared'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { VdbResponseDto, VdbStatsDto } from './vdb.dto.js'
import { VdbService } from './vdb.service.js'
import { VdbStatsService } from './vdb-stats.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  /** Registry `kind` text (ЛЕГКОВИЙ, МОТОЦИКЛ, ВАНТАЖНИЙ, АВТОБУС …); omitted = any catalog kind. */
  kind: z.string().trim().min(1).optional()
})

const statsQuerySchema = z.object({ kind: z.enum(VDB_VEHICLE_CLASSES).default('car') })

@ApiTags('vdb')
@Controller('api/vdb')
export class VdbController {
  constructor(
    @Inject(VdbService) private readonly vdbService: VdbService,
    @Inject(VdbStatsService) private readonly vdbStatsService: VdbStatsService
  ) {}

  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'kind', required: false })
  @ApiOkResponse({ type: VdbResponseDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<VdbResponseDto> {
    return this.vdbService.lookup(query.brand, query.model, query.kind)
  }

  // Rollup for the /stats markets panel, rebuilt by `pnpm db:refresh-vdb-stats` — see vdb-stats.service.ts.
  @Get('stats')
  @ApiQuery({ name: 'kind', required: false, enum: VDB_VEHICLE_CLASSES })
  @ApiOkResponse({ type: VdbStatsDto })
  stats(@Query(zodParam(statsQuerySchema)) query: z.infer<typeof statsQuerySchema>): Promise<VdbStatsDto> {
    return this.vdbStatsService.get(query.kind)
  }
}
