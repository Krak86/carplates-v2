import { Controller, Get, Inject, NotFoundException, Query, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { roadSafetyHazardsQuerySchema, roadSafetyRoadsQuerySchema, roadSafetyYearQuerySchema } from '@carplates/shared'
import type { RoadSafetyHazardsQuery, RoadSafetyRoadsQuery, RoadSafetyYearQuery } from '@carplates/shared'

import { lookupCacheInterceptor, STATS_CACHE } from '../common/cache.js'
import { ROAD_SAFETY_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import {
  RoadSafetyCausesDto,
  RoadSafetyHazardsDto,
  RoadSafetyRegionsDto,
  RoadSafetyRoadsDto,
  RoadSafetyTimeDto
} from './road-safety.dto.js'
import { RoadSafetyService } from './road-safety.service.js'

const orNotFound = <T>(value: T | null): T => {
  if (value === null) throw new NotFoundException('no road-safety data for this year')
  return value
}

/** Road crashes with injured / killed (Patrol Police) and hazardous road sections. Not vehicle data: `/api/safety` is the crash ratings. */
@ApiTags('road-safety')
@Controller('api/road-safety')
@Throttle(ROAD_SAFETY_THROTTLE)
/** Edge-cached like the stats rollups, but only on success: a 400 / 404 must not be kept for hours. */
@UseInterceptors(lookupCacheInterceptor(STATS_CACHE))
export class RoadSafetyController {
  constructor(@Inject(RoadSafetyService) private readonly roadSafety: RoadSafetyService) {}

  @Get('regions')
  @ApiQuery({ name: 'year', required: false, description: 'Default: the latest full year' })
  @ApiOkResponse({ type: RoadSafetyRegionsDto })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async regions(@Query(zodParam(roadSafetyYearQuerySchema)) query: RoadSafetyYearQuery): Promise<RoadSafetyRegionsDto> {
    return orNotFound(await this.roadSafety.regions(query))
  }

  @Get('roads')
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Default 50, max 300' })
  @ApiOkResponse({ type: RoadSafetyRoadsDto })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async roads(@Query(zodParam(roadSafetyRoadsQuerySchema)) query: RoadSafetyRoadsQuery): Promise<RoadSafetyRoadsDto> {
    return orNotFound(await this.roadSafety.roads(query))
  }

  @Get('causes')
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: RoadSafetyCausesDto })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async causes(@Query(zodParam(roadSafetyYearQuerySchema)) query: RoadSafetyYearQuery): Promise<RoadSafetyCausesDto> {
    return orNotFound(await this.roadSafety.causes(query))
  }

  @Get('time')
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: RoadSafetyTimeDto })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async time(@Query(zodParam(roadSafetyYearQuerySchema)) query: RoadSafetyYearQuery): Promise<RoadSafetyTimeDto> {
    return orNotFound(await this.roadSafety.time(query))
  }

  @Get('hazards')
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'region', required: false, description: 'Plate region name, e.g. "Львівська область"' })
  @ApiQuery({ name: 'kind', required: false, enum: ['hazard', 'concentration'] })
  @ApiOkResponse({ type: RoadSafetyHazardsDto })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async hazards(
    @Query(zodParam(roadSafetyHazardsQuerySchema)) query: RoadSafetyHazardsQuery
  ): Promise<RoadSafetyHazardsDto> {
    return orNotFound(await this.roadSafety.hazards(query))
  }
}
