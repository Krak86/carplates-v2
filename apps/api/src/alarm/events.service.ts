import { Inject, Injectable } from '@nestjs/common'
import { alarmEvents } from '@carplates/db'
import { alarmStatsResponseSchema } from '@carplates/shared'
import type { ActiveAlarmArea, AlarmStatsResponse } from '@carplates/shared'
import { and, gte, inArray, isNull, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { buildStats, diffAreas } from './events.helpers.js'

/** Kyiv day boundaries need the whole previous day: 3 days back always covers it. */
const LOOKBACK_MS = 3 * 24 * 60 * 60_000

/**
 * Records live alerts into `registry.alarm_events` after every good poll and reads today's numbers back. State is the
 * table itself (open rows), not memory, so a restart or two instances (blue/green) never double-count: the partial unique
 * index allows one open row per area and inserts use ON CONFLICT DO NOTHING.
 */
@Injectable()
export class AlarmEventsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** `active` must come from a successful poll: a failed one must not close alerts. */
  async record(active: readonly ActiveAlarmArea[], now: Date): Promise<void> {
    const { db } = this.dbService
    const open = await db.select({ areaId: alarmEvents.areaId }).from(alarmEvents).where(isNull(alarmEvents.endedAt))
    const { toOpen, toClose } = diffAreas(new Set(open.map(o => o.areaId)), active)

    if (toClose.length > 0) {
      await db
        .update(alarmEvents)
        .set({ endedAt: now })
        .where(and(isNull(alarmEvents.endedAt), inArray(alarmEvents.areaId, toClose)))
    }
    if (toOpen.length > 0) {
      await db
        .insert(alarmEvents)
        .values(
          toOpen.map(a => ({
            areaId: a.areaId,
            areaName: a.name,
            region: a.region,
            kind: a.kind,
            level: a.level,
            types: a.types,
            startedAt: a.since ? new Date(a.since) : now
          }))
        )
        .onConflictDoNothing()
    }
  }

  async stats(now = new Date()): Promise<AlarmStatsResponse> {
    const { db } = this.dbService
    const rows = await db
      .select({
        areaName: alarmEvents.areaName,
        region: alarmEvents.region,
        startedAt: alarmEvents.startedAt,
        endedAt: alarmEvents.endedAt
      })
      .from(alarmEvents)
      .where(gte(alarmEvents.startedAt, new Date(now.getTime() - LOOKBACK_MS)))
    const [first] = await db.select({ at: sql<Date | null>`min(${alarmEvents.startedAt})` }).from(alarmEvents)
    return alarmStatsResponseSchema.parse(buildStats(rows, first?.at ? new Date(first.at) : null, now))
  }
}
