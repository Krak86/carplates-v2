import { Controller, Get, Inject, UseInterceptors } from '@nestjs/common'
import { ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger'
import type { AlarmsResponse } from '@carplates/shared'

import { ALARM_CACHE, lookupCacheInterceptor } from '../common/cache.js'
import { AlarmService } from './alarm.service.js'

/**
 * Oblasts with an active air-raid alert, from our own poller. Informational, not a warning system. Deliberately not in
 * `PUBLIC_API_PATH_PREFIXES` (terms: no mirroring of the upstream API); the Cloudflare Cache Rule lists it. 503 when stale.
 */
@ApiTags('alarms')
@Controller('api/alarms')
@UseInterceptors(lookupCacheInterceptor(ALARM_CACHE))
export class AlarmController {
  constructor(@Inject(AlarmService) private readonly alarms: AlarmService) {}

  @Get()
  @ApiServiceUnavailableResponse({ description: 'No data or the data is too old: show "no data", never "no alert"' })
  current(): AlarmsResponse {
    return this.alarms.current()
  }
}
