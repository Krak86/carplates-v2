import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { STATS_FIELD_DIMENSIONS, statsFieldDimensionSchema } from '@carplates/shared'
import type {
  DistributionResponse,
  EvStatsResponse,
  ImportsStatsResponse,
  SizeModelsResponse,
  StatsFieldDimension,
  StatsFieldResponse
} from '@carplates/shared'

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

  @Get('distribution')
  @ApiOkResponse({
    description: 'Fleet histograms { width, buckets: [[edge, cars]] } for power, hp/tonne and engine size'
  })
  distribution(): Promise<DistributionResponse> {
    return this.statsService.distribution()
  }

  @Get('size-models')
  @ApiOkResponse({
    description:
      'Passenger models { brand, model, n, body, rdwBody, lengthMm, widthMm, heightMm, wheelbaseMm }, biggest first'
  })
  sizeModels(): Promise<SizeModelsResponse> {
    return this.statsService.sizeModels()
  }

  @Get('ev')
  @ApiOkResponse({
    description:
      'Electrified passenger cars { total, fleet, byYear, byRegion, topModels }: electric-only vs hybrid with electricity'
  })
  ev(): Promise<EvStatsResponse> {
    return this.statsService.ev()
  }

  @Get('imports')
  @ApiOkResponse({
    description:
      'Used imports vs dealer sales { total, byYear, byCountry, topModels } by registration operation; country = the VIN build country'
  })
  imports(): Promise<ImportsStatsResponse> {
    return this.statsService.imports()
  }

  @Get('field/:dimension')
  @ApiParam({ name: 'dimension', enum: STATS_FIELD_DIMENSIONS })
  @ApiOkResponse({ description: 'Rows of { value, totalRows, distinctPlates, distinctVins }' })
  field(
    @Param('dimension', zodParam(statsFieldDimensionSchema)) dimension: StatsFieldDimension
  ): Promise<StatsFieldResponse> {
    return this.statsService.field(dimension)
  }

  @Get('version')
  @ApiOkResponse({ type: DataVersionResponseDto })
  version(): Promise<DataVersionResponseDto> {
    return this.statsService.version()
  }
}
