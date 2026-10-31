/**
 * Seed-CSV dump/load of the road-safety tables (`registry.dtp_*`: Patrol Police yearly aggregates + hazardous sections), so a
 * new setup loads them instead of downloading the sources. Cumulative snapshot: re-export after `ingest:dtp` /
 * `ingest:dtp:patrol` (docs/road-safety-plan.md). Columns come from the Drizzle table, so a schema change needs no edit here.
 *
 *   pnpm export:dtp:csv   # -> seed-data/dtp-<table>.csv.gz
 *   pnpm ingest:dtp:csv   # load them (insert-only, safe to repeat)
 */
import {
  createDb,
  dtpCauseYear,
  dtpHazardSection,
  dtpRegionYear,
  dtpRoadYear,
  dtpTimeYear,
  dtpTypeYear
} from '@carplates/db'
import type { Db } from '@carplates/db'
import { getTableColumns } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'

import { readCsv, writeCsv } from './csv-io.js'

const BATCH = 1000

const TABLES = [
  { file: 'region-year', table: dtpRegionYear },
  { file: 'cause-year', table: dtpCauseYear },
  { file: 'type-year', table: dtpTypeYear },
  { file: 'time-year', table: dtpTimeYear },
  { file: 'road-year', table: dtpRoadYear },
  { file: 'hazard-section', table: dtpHazardSection }
] as const satisfies readonly { file: string; table: PgTable }[]

const csvPath = (file: string): string => `seed-data/dtp-${file}.csv.gz`

async function exportCsv(db: Db): Promise<void> {
  for (const { file, table } of TABLES) {
    const columns = getTableColumns(table)
    const keys = Object.keys(columns)
    const rows = (await db.select().from(table)) as Record<string, unknown>[]
    const size = await writeCsv(
      csvPath(file),
      keys,
      rows.map(r => Object.fromEntries(keys.map(k => [k, r[k] ?? ''])))
    )
    console.log(`${rows.length} row(s) -> ${csvPath(file)} (${size} B)`)
  }
}

async function importCsv(db: Db): Promise<void> {
  for (const { file, table } of TABLES) {
    const csv = await readCsv(csvPath(file))
    if (!csv) {
      console.log(`no ${csvPath(file)} yet - skipped (run ingest:dtp / ingest:dtp:patrol, then export:dtp:csv)`)
      continue
    }
    const columns = Object.entries(getTableColumns(table))
    const rows = csv.records.map(r =>
      Object.fromEntries(
        columns.map(([key, col]) => {
          const raw = r[key] ?? ''
          if (raw === '' && !col.notNull) return [key, null]
          return [key, col.dataType === 'number' ? Number(raw) : raw]
        })
      )
    )
    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(table)
        .values(rows.slice(i, i + BATCH) as never)
        .onConflictDoNothing()
    }
    console.log(`${rows.length} row(s) loaded from ${csv.path}`)
  }
}

async function main(): Promise<void> {
  const { db, close } = createDb()
  try {
    if (process.argv.includes('--export-csv')) await exportCsv(db)
    else await importCsv(db)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
