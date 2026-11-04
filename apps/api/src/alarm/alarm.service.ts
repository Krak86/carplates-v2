import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { activeAlarmAreas, activeAlarmRegions, buildOblastIndex } from '@carplates/shared'
import type { ActiveAlarmArea, AlarmRegion, AlarmsResponse, OblastIndex } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { AlarmRateLimitedError, ALARM_SOURCE } from './alarm-source.js'
import type { AlarmSource } from './alarm-source.js'
import { AlarmEventsService } from './events.service.js'
import { isFresh } from './helpers.js'

/** The region tree changes rarely; one call a day (the upstream limit is per minute, so it is spent carefully). */
const TREE_TTL_MS = 24 * 60 * 60_000

/**
 * One poller keeps the active alerts in memory; visitors read this cache, so the key never reaches the browser and upstream
 * sees one request per interval however many people are online. Fails closed: no data or an old snapshot = 503.
 * A 429 pauses polling for the `Retry-After` the upstream asked for.
 */
@Injectable()
export class AlarmService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AlarmService.name)
  private readonly env = loadEnv()
  private regions: AlarmRegion[] = []
  private fetchedAt: number | null = null
  private index: OblastIndex | null = null
  private indexAt = 0
  private pausedUntil = 0
  private timer: NodeJS.Timeout | undefined

  constructor(
    @Inject(ALARM_SOURCE) private readonly source: AlarmSource,
    @Inject(AlarmEventsService) private readonly events: AlarmEventsService
  ) {}

  onModuleInit(): void {
    if (!this.source.enabled || this.env.NODE_ENV === 'test') return
    void this.poll()
    this.timer = setInterval(() => void this.poll(), this.env.ALARM_POLL_SECONDS * 1000)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    clearInterval(this.timer)
  }

  private async poll(): Promise<void> {
    const now = Date.now()
    if (now < this.pausedUntil) return
    try {
      if (!this.index || now - this.indexAt > TREE_TTL_MS) {
        this.index = buildOblastIndex(await this.source.fetchRegions())
        this.indexAt = now
      }
      const upstream = await this.source.fetchAlerts()
      this.regions = activeAlarmRegions(upstream, this.index)
      this.fetchedAt = Date.now()
      await this.recordEvents(activeAlarmAreas(upstream, this.index))
    } catch (err) {
      if (err instanceof AlarmRateLimitedError) {
        this.pausedUntil = Date.now() + (err.retryAfterSeconds + 1) * 1000
        this.log.warn(`alarm poll paused ${err.retryAfterSeconds}s (upstream rate limit)`)
        return
      }
      // Keep the old snapshot: it goes stale on its own and `current()` then refuses it.
      this.log.warn(`alarm poll failed: ${(err as Error).message}`)
    }
  }

  /** A recorder failure (DB down) must never take the live map down: the live snapshot is already stored. */
  private async recordEvents(areas: readonly ActiveAlarmArea[]): Promise<void> {
    try {
      await this.events.record(areas, new Date())
    } catch (err) {
      this.log.warn(`alarm event recording failed: ${(err as Error).message}`)
    }
  }

  current(): AlarmsResponse {
    if (!this.source.enabled || this.fetchedAt === null || !isFresh(this.fetchedAt, Date.now())) {
      throw new ServiceUnavailableException('no alarm data')
    }
    return { fetchedAt: new Date(this.fetchedAt).toISOString(), regions: this.regions }
  }
}
