import { Controller, Get, Inject, NotFoundException, Query, UseInterceptors } from '@nestjs/common'
import { ApiNotFoundResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { alarmHistoryQuerySchema } from '@carplates/shared'
import type { AlarmHistoryQuery, AlarmHistoryResponse } from '@carplates/shared'

import { lookupCacheInterceptor, STATS_CACHE } from '../common/cache.js'
import { ALARM_HISTORY_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { AlarmHistoryService } from './history.service.js'

/**
 * Per oblast and year air-raid alert history from the MIT siren dataset (not the Ukraine Alarm API). Changes only on ingest:
 * edge-cached like the stats rollups, only on success. Not in `PUBLIC_API_PATH_PREFIXES`.
 */
@ApiTags('alarms')
@Controller('api/alarms/history')
@Throttle(ALARM_HISTORY_THROTTLE)
@UseInterceptors(lookupCacheInterceptor(STATS_CACHE))
export class AlarmHistoryController {
  constructor(@Inject(AlarmHistoryService) private readonly history: AlarmHistoryService) {}

  @Get()
  @ApiQuery({ name: 'year', required: false, description: 'Default: the newest year with data' })
  @ApiNotFoundResponse({ description: 'No data for the year' })
  async byYear(@Query(zodParam(alarmHistoryQuerySchema)) query: AlarmHistoryQuery): Promise<AlarmHistoryResponse> {
    const result = await this.history.history(query)
    if (!result) throw new NotFoundException('no alert history for this year')
    return result
  }
}
