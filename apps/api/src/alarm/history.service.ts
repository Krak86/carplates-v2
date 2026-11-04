import { Inject, Injectable } from '@nestjs/common'
import { alarmHistoryDaily } from '@carplates/db'
import { alarmHistoryResponseSchema } from '@carplates/shared'
import type { AlarmHistoryQuery, AlarmHistoryResponse } from '@carplates/shared'
import { and, gte, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { buildHistory, pickHistoryYear } from './history.helpers.js'

/** Yearly rollup of `registry.alarm_history_daily` (MIT siren dataset). The table is loaded by `ingest:alarm-history`, not by the poller. */
@Injectable()
export class AlarmHistoryService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Null when the table is empty or the year has no rows: the controller answers 404. */
  async history(query: AlarmHistoryQuery): Promise<AlarmHistoryResponse | null> {
    const { db } = this.dbService
    const yearRows = await db
      .selectDistinct({ year: sql<number>`extract(year FROM ${alarmHistoryDaily.day})::int` })
      .from(alarmHistoryDaily)
    const years = yearRows.map(r => r.year)
    const year = pickHistoryYear(years, query.year)
    if (year === null) return null

    const rows = await db
      .select({
        region: alarmHistoryDaily.region,
        source: alarmHistoryDaily.source,
        alerts: sql<number>`sum(${alarmHistoryDaily.alerts})::int`,
        seconds: sql<number>`sum(${alarmHistoryDaily.seconds})::int`,
        longestSeconds: sql<number>`max(${alarmHistoryDaily.longestSeconds})::int`,
        estimatedAlerts: sql<number>`sum(${alarmHistoryDaily.estimatedAlerts})::int`,
        firstDay: sql<string>`min(${alarmHistoryDaily.day})::text`,
        lastDay: sql<string>`max(${alarmHistoryDaily.day})::text`
      })
      .from(alarmHistoryDaily)
      .where(and(gte(alarmHistoryDaily.day, `${year}-01-01`), lt(alarmHistoryDaily.day, `${year + 1}-01-01`)))
      .groupBy(alarmHistoryDaily.region, alarmHistoryDaily.source)
    return alarmHistoryResponseSchema.parse(buildHistory(year, years, rows))
  }
}
