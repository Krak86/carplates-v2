import { Controller, Get, Header, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { STATS_FIELD_DIMENSIONS, statsFieldDimensionSchema } from '@carplates/shared'
import type {
  DistributionResponse,
  EvStatsResponse,
  ImportsStatsResponse,
  OriginStatsResponse,
  RegionBrandStatsResponse,
  SizeModelsResponse,
  StatsFieldDimension,
  StatsFieldResponse
} from '@carplates/shared'

import { ROLLUP_CACHE } from '../common/cache.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { DataVersionResponseDto, StatsResponseDto, StatsTopResponseDto } from './stats.dto.js'
import { StatsService } from './stats.service.js'

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get()
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({ type: StatsResponseDto })
  get(): Promise<StatsResponseDto> {
    return this.statsService.get()
  }

  @Get('top')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({ type: StatsTopResponseDto })
  top(): Promise<StatsTopResponseDto> {
    return this.statsService.top()
  }

  @Get('distribution')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description: 'Fleet histograms { width, buckets: [[edge, cars]] } for power, hp/tonne and engine size'
  })
  distribution(): Promise<DistributionResponse> {
    return this.statsService.distribution()
  }

  @Get('size-models')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description:
      'Passenger models { brand, model, n, body, rdwBody, lengthMm, widthMm, heightMm, wheelbaseMm }, biggest first'
  })
  sizeModels(): Promise<SizeModelsResponse> {
    return this.statsService.sizeModels()
  }

  @Get('ev')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description:
      'Electrified passenger cars { total, fleet, byYear, byRegion, topModels }: electric-only vs hybrid with electricity'
  })
  ev(): Promise<EvStatsResponse> {
    return this.statsService.ev()
  }

  @Get('imports')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description:
      'Used imports vs dealer sales { total, byYear, byCountry, topModels } by registration operation; country = the VIN build country'
  })
  imports(): Promise<ImportsStatsResponse> {
    return this.statsService.imports()
  }

  @Get('origin')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description:
      'Passenger cars { total, byBrand, byPlant } by brand home country and VIN assembly country (ISO or a former state by model year; empty country = unknown)'
  })
  origin(): Promise<OriginStatsResponse> {
    return this.statsService.origin()
  }

  @Get('region-brands')
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({
    description:
      'Passenger cars { regions: [{ region, fleet, brands: [{ brand, n }] }] }: the 5 biggest brands per plate region'
  })
  regionBrands(): Promise<RegionBrandStatsResponse> {
    return this.statsService.regionBrands()
  }

  @Get('field/:dimension')
  @Header('Cache-Control', ROLLUP_CACHE)
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
