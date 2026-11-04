import { Injectable, Logger } from '@nestjs/common'
import { upstreamAlertsResponseSchema, upstreamRegionsResponseSchema } from '@carplates/shared'
import type { UpstreamRegionAlerts, UpstreamRegionNode } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { AlarmRateLimitedError } from './alarm-source.js'
import type { AlarmSource } from './alarm-source.js'

const TIMEOUT_MS = 10_000
const DEFAULT_RETRY_AFTER_S = 60

/** Ukraine Alarm API (Stfalcon): one request per call. The key goes in `Authorization` and nowhere else (never logged). */
@Injectable()
export class UkraineAlarmSource implements AlarmSource {
  private readonly log = new Logger(UkraineAlarmSource.name)
  private readonly env = loadEnv()

  get enabled(): boolean {
    return !!this.env.ALARM_API_KEY
  }

  async fetchAlerts(): Promise<UpstreamRegionAlerts[]> {
    return upstreamAlertsResponseSchema.parse(await this.get('/api/v3/alerts'))
  }

  async fetchRegions(): Promise<UpstreamRegionNode[]> {
    return upstreamRegionsResponseSchema.parse(await this.get('/api/v3/regions')).states
  }

  private async get(path: string): Promise<unknown> {
    const key = this.env.ALARM_API_KEY
    if (!key) throw new Error('alarm source is not configured')
    const res = await fetch(`${this.env.ALARM_BASE_URL}${path}`, {
      headers: { Authorization: key, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after'))
      throw new AlarmRateLimitedError(Number.isFinite(wait) && wait > 0 ? wait : DEFAULT_RETRY_AFTER_S)
    }
    if (!res.ok) {
      this.log.warn(`Ukraine Alarm ${path} answered ${res.status}`)
      throw new Error(`upstream status ${res.status}`)
    }
    return res.json()
  }
}
