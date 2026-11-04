/** Seed CSV dump/load of `registry.tuning_links` (`--export-csv` / `--from-csv` of `ingest:3dtuning`). A seed is the whole table. */
import { tuningLinks } from '@carplates/db'
import type { Db, TuningLinkInsert } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'

const BATCH = 1000
const COLUMNS = ['make_slug', 'model_slug', 'body', 'generation', 'start_year', 'path'] as const

export async function exportTuningLinks(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(tuningLinks).orderBy(tuningLinks.path)
  const size = await writeCsv(
    path,
    COLUMNS,
    rows.map(r => ({
      make_slug: r.makeSlug,
      model_slug: r.modelSlug,
      body: r.body,
      generation: r.generation,
      start_year: r.startYear,
      path: r.path
    }))
  )
  console.log(`exported ${rows.length} 3DTuning page(s) to ${path} (${(size / 1024).toFixed(1)} KB)`)
}

export async function importTuningLinks(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no 3DTuning seed at ${path} (run pnpm export:3dtuning:csv first)`)
    return
  }
  const rows: TuningLinkInsert[] = csv.records.map(r => ({
    makeSlug: r.make_slug!,
    modelSlug: r.model_slug!,
    body: r.body ?? '',
    generation: r.generation ?? '',
    startYear: Number(r.start_year),
    path: r.path!
  }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.tuning_links`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(tuningLinks)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  console.log(`loaded ${rows.length} 3DTuning page(s)`)
}
