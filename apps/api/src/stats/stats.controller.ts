import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { STATS_FIELD_DIMENSIONS, statsFieldDimensionSchema } from '@carplates/shared'
import type { StatsFieldDimension, StatsFieldResponse } from '@carplates/shared'

import { zodParam } from '../common/zod-param.pipe.js'
import { DataVersionResponseDto, StatsResponseDto, StatsTopResponseDto } from './stats.dto.js'
import { StatsService } from './stats.service.js'

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get()
  @ApiOkResponse({ type: StatsResponseDto })
  get(): Promise<StatsResponseDto> {
    return this.statsService.get()
  }

  @Get('top')
  @ApiOkResponse({ type: StatsTopResponseDto })
  top(): Promise<StatsTopResponseDto> {
    return this.statsService.top()
  }

  @Get('field/:dimension')
  @ApiParam({ name: 'dimension', enum: STATS_FIELD_DIMENSIONS })
  @ApiOkResponse({ description: 'Rows of { value, totalRows, distinctPlates, distinctVins }' })
  field(@Param('dimension', zodParam(statsFieldDimensionSchema)) dimension: StatsFieldDimension): Promise<StatsFieldResponse> {
    return this.statsService.field(dimension)
  }

  @Get('version')
  @ApiOkResponse({ type: DataVersionResponseDto })
  version(): Promise<DataVersionResponseDto> {
    return this.statsService.version()
  }
}
