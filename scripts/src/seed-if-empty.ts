/**
 * Loads the committed seed CSV of each small "added once" table, but only when the table is empty, so it is safe to run after every deploy
 * (`run-ingest.sh seed-if-empty`). A table that already has rows is left alone (the importers replace the whole table).
 *
 *   tsx src/seed-if-empty.ts
 */
import { alarmHistoryDaily, createDb, oemLinks, tuningLinks } from '@carplates/db'
import type { Db } from '@carplates/db'
import { count } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'

import { importAlarmHistory } from './alarm-history-csv.js'
import { importOemLinks } from './oem-csv.js'
import { importTuningLinks } from './tuning-csv.js'

type Seed = { name: string; table: PgTable; file: string; load: (db: Db, path: string) => Promise<void> }

const SEEDS: readonly Seed[] = [
  { name: '3dtuning', table: tuningLinks, file: 'seed-data/3dtuning-links.csv.gz', load: importTuningLinks },
  { name: 'oem-links', table: oemLinks, file: 'seed-data/oem-links.csv.gz', load: importOemLinks },
  { name: 'alarm-history', table: alarmHistoryDaily, file: 'seed-data/alarm-history.csv.gz', load: importAlarmHistory }
]

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    for (const seed of SEEDS) {
      const [row] = await db.select({ n: count() }).from(seed.table)
      if ((row?.n ?? 0) > 0) {
        console.log(`${seed.name}: ${String(row?.n)} row(s) already there, skipped`)
        continue
      }
      console.log(`${seed.name}: empty, loading ${seed.file}`)
      await seed.load(db, seed.file)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
