/**
 * Loads the daily war-loss history into `registry.war_losses_daily` from russianwarship.rip (third-party community API of the
 * General Staff "approximate" figures; ~1,700 daily records). Upsert by day, safe to repeat. The API keeps the newest day
 * current on its own (`apps/api/src/losses`), so this only backfills or repairs a gap.
 *
 *   pnpm ingest:losses              # page through /statistics and upsert everything
 *   pnpm ingest:losses --dry-run    # fetch and print, write nothing
 */
import { createDb, warLossesDaily } from '@carplates/db'
import type { WarLossesDailyInsert } from '@carplates/db'
import { LOSSES_SOURCE_URL, lossRecordToRow, upstreamLossPageSchema } from '@carplates/shared'
import { sql } from 'drizzle-orm'

/** Upstream rejects a limit above 50 (422). */
const PAGE_SIZE = 50
const TIMEOUT_MS = 30_000
const BATCH = 500
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function fetchAll(): Promise<WarLossesDailyInsert[]> {
  const byDay = new Map<string, WarLossesDailyInsert>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${LOSSES_SOURCE_URL}/statistics?offset=${offset}&limit=${PAGE_SIZE}`, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`upstream status ${res.status} at offset ${offset}`)
    const { records } = upstreamLossPageSchema.parse(await res.json()).data
    for (const r of records) {
      const row = lossRecordToRow(r)
      if (Object.keys(row.stats).length > 0) byDay.set(row.day, row)
    }
    log(`offset ${offset}: ${records.length} record(s), ${byDay.size} day(s) so far`)
    if (records.length < PAGE_SIZE) break
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

async function main(): Promise<void> {
  const rows = await fetchAll()
  if (rows.length === 0) throw new Error('upstream returned no records: nothing to write')
  log(`${rows.length} day row(s); first ${rows[0]?.day}, last ${rows[rows.length - 1]?.day}`)
  if (process.argv.includes('--dry-run')) {
    log('dry-run: nothing written')
    return
  }
  const { db, close } = createDb()
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(warLossesDaily)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: warLossesDaily.day,
          set: {
            dayNumber: sql`excluded.day_number`,
            resource: sql`excluded.resource`,
            stats: sql`excluded.stats`,
            increase: sql`excluded.increase`,
            fetchedAt: sql`now()`
          }
        })
    }
    log(`upserted ${rows.length} day row(s) into registry.war_losses_daily`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
