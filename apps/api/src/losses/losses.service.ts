import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { warLossesDaily } from '@carplates/db'
import {
  LOSSES_SOURCE_URL,
  lossRecordToRow,
  lossesHistoryResponseSchema,
  lossesResponseSchema,
  upstreamLossLatestSchema
} from '@carplates/shared'
import type { LossesHistoryQuery, LossesHistoryResponse, LossesResponse } from '@carplates/shared'
import { asc, desc, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv } from '../env.js'

import { toLossesHistory, toLossesResponse } from './losses.helpers.js'

/** The upstream updates once a day; checking every 6 hours picks the new day up within hours and survives a missed run. */
const FETCH_EVERY_MS = 6 * 60 * 60_000
const TIMEOUT_MS = 15_000
const USER_AGENT = 'carsua.app/1.0 (+https://carsua.app)'

/**
 * War-loss figures (General Staff "approximate" numbers via russianwarship.rip). We keep our own daily copy in
 * `registry.war_losses_daily`: this service fetches `/statistics/latest` on a timer and upserts it; the full history is
 * loaded once by `pnpm ingest:losses`. Reads never touch upstream, so the page survives an outage. An upsert makes two
 * instances (blue/green) fetching at once harmless. A fetch failure is only logged.
 */
@Injectable()
export class LossesService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(LossesService.name)
  private readonly env = loadEnv()
  private timer: NodeJS.Timeout | undefined

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  onModuleInit(): void {
    if (this.env.NODE_ENV === 'test') return
    void this.refresh()
    this.timer = setInterval(() => void this.refresh(), FETCH_EVERY_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    clearInterval(this.timer)
  }

  async refresh(): Promise<void> {
    try {
      const res = await fetch(`${LOSSES_SOURCE_URL}/statistics/latest`, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`upstream status ${res.status}`)
      const row = lossRecordToRow(upstreamLossLatestSchema.parse(await res.json()).data)
      if (Object.keys(row.stats).length === 0) throw new Error('upstream record has no counters')
      await this.dbService.db
        .insert(warLossesDaily)
        .values(row)
        .onConflictDoUpdate({
          target: warLossesDaily.day,
          set: {
            dayNumber: row.dayNumber,
            resource: row.resource,
            stats: row.stats,
            increase: row.increase,
            fetchedAt: sql`now()`
          }
        })
    } catch (err) {
      this.log.warn(`war-loss fetch failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Null when nothing is stored yet: the controller answers 404 and the page hides the section. */
  async latest(): Promise<LossesResponse | null> {
    const [row] = await this.dbService.db.select().from(warLossesDaily).orderBy(desc(warLossesDaily.day)).limit(1)
    return row ? lossesResponseSchema.parse(toLossesResponse(row)) : null
  }

  async history(query: LossesHistoryQuery): Promise<LossesHistoryResponse | null> {
    const rows = await this.dbService.db.select().from(warLossesDaily).orderBy(asc(warLossesDaily.day))
    if (rows.length === 0) return null
    return lossesHistoryResponseSchema.parse(toLossesHistory(query.category, rows))
  }
}
