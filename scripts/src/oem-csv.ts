/** Seed CSV dump/load of `registry.oem_links` (`--export-csv` / `--from-csv` of `ingest:oem-links`). A seed is the whole table. */
import { oemLinks } from '@carplates/db'
import type { Db, OemLinkInsert } from '@carplates/db'
import { OEM_LINK_KINDS } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'

const COLUMNS = ['make_slug', 'model_slug', 'variant', 'kind', 'url'] as const

export async function exportOemLinks(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(oemLinks)
    .orderBy(oemLinks.makeSlug, oemLinks.modelSlug, oemLinks.variant, oemLinks.url)
  const size = await writeCsv(
    path,
    COLUMNS,
    rows.map(r => ({ make_slug: r.makeSlug, model_slug: r.modelSlug, variant: r.variant, kind: r.kind, url: r.url }))
  )
  console.log(`exported ${rows.length} official link(s) to ${path} (${(size / 1024).toFixed(1)} KB)`)
}

/** Replaces the table with the given rows (the seed loader and the scraper share this). */
export async function replaceOemLinks(db: Db, rows: readonly OemLinkInsert[]): Promise<void> {
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.oem_links`)
    if (rows.length)
      await tx
        .insert(oemLinks)
        .values([...rows])
        .onConflictDoNothing()
  })
}

export async function importOemLinks(db: Db, path: string): Promise<void> {
  const csv = await readCsv(path)
  if (!csv) {
    console.log(`skipped: no official-links seed at ${path} (run pnpm export:oem-links:csv first)`)
    return
  }
  const rows: OemLinkInsert[] = csv.records
    .filter(r => r.make_slug && r.model_slug && r.url && OEM_LINK_KINDS.some(k => k === r.kind))
    .map(r => ({
      makeSlug: r.make_slug!,
      modelSlug: r.model_slug!,
      variant: r.variant ?? '',
      kind: r.kind!,
      url: r.url!
    }))
  await replaceOemLinks(db, rows)
  console.log(`loaded ${rows.length} official link(s)`)
}
