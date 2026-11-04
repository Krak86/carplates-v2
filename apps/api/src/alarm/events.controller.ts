import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { AlarmStatsResponse } from '@carplates/shared'

import { ALARM_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { ALARM_HISTORY_THROTTLE } from '../common/throttle.js'

import { AlarmEventsService } from './events.service.js'

/**
 * Today's alert numbers from our own recorder (not the upstream API). Short edge cache like the live endpoint; not in
 * `PUBLIC_API_PATH_PREFIXES`. Answers 200 with zeros before anything is recorded: `recordingSince` is then null.
 */
@ApiTags('alarms')
@Controller('api/alarms/stats')
@Throttle(ALARM_HISTORY_THROTTLE)
@UseInterceptors(lookupCacheInterceptor(ALARM_CACHE))
export class AlarmEventsController {
  constructor(@Inject(AlarmEventsService) private readonly events: AlarmEventsService) {}

  @Get()
  stats(): Promise<AlarmStatsResponse> {
    return this.events.stats()
  }
}
