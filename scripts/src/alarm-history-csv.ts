/** Seed CSV dump/load of `registry.alarm_history_daily` (`--export-csv` / `--from-csv` of `ingest:alarm-history`). A seed is the whole table. */
import { alarmHistoryDaily } from '@carplates/db'
import type { AlarmHistoryDailyInsert, Db } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { ALARM_HISTORY_SOURCES } from './alarm-history-parse.js'
import { readCsv, writeCsv } from './csv-io.js'

const COLUMNS = ['region', 'source', 'day', 'alerts', 'seconds', 'longest_seconds', 'estimated_alerts'] as const
const BATCH = 2000

export async function exportAlarmHistory(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(alarmHistoryDaily)
    .orderBy(alarmHistoryDaily.day, alarmHistoryDaily.source, alarmHistoryDaily.region)
  const size = await writeCsv(
    path,
    COLUMNS,
    rows.map(r => ({
      region: r.region,
      source: r.source,
      day: r.day,
      alerts: r.alerts,
      seconds: r.seconds,
      longest_seconds: r.longestSeconds,
      estimated_alerts: r.estimatedAlerts
    }))
  )
  console.log(`exported ${rows.length} alarm-history day(s) to ${path} (${(size / 1024).toFixed(1)} KB)`)
}

/** Replaces the table with the given rows (the seed loader and the dataset loader share this). */
export async function replaceAlarmHistory(db: Db, rows: readonly AlarmHistoryDailyInsert[]): Promise<void> {
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.alarm_history_daily`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(alarmHistoryDaily)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
}

export async function importAlarmHistory(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no alarm-history seed at ${path} (run pnpm export:alarm-history:csv first)`)
    return
  }
  const rows: AlarmHistoryDailyInsert[] = csv.records
    .filter(r => r.region && r.day && ALARM_HISTORY_SOURCES.some(s => s === r.source))
    .map(r => ({
      region: r.region!,
      source: r.source!,
      day: r.day!,
      alerts: Number(r.alerts),
      seconds: Number(r.seconds),
      longestSeconds: Number(r.longest_seconds),
      estimatedAlerts: Number(r.estimated_alerts ?? 0)
    }))
  await replaceAlarmHistory(db, rows)
  console.log(`loaded ${rows.length} alarm-history day(s)`)
}
