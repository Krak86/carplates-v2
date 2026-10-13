/**
 * Winner Imports (stock.winner.ua) interior 360° panoramas into `registry.winner_360`, so a result card's 360° modal can
 * offer an "Alt. interior" tab (see PLAN.md). Facts + links only — the viewer is Winner's own `/360.php` page.
 *
 *   pnpm ingest:winner360             # ONE request to the dealer's public JSON endpoint -> rows (replaces the whole set)
 *   pnpm ingest:winner360 -- --dry-run    # fetch + parse + print a summary, write nothing
 *   pnpm ingest:winner360 -- --export-csv ./x.csv[.gz]   # dump the table (`pnpm export:winner360:csv`)
 *   pnpm ingest:winner360 -- --from-csv ./x.csv[.gz]     # load a dump, no fetching (`pnpm ingest:winner360:csv`)
 *
 * The stock page builds its cards from `api.php?query=vehicles_group/any/…` (all ~185 cards, ~200 KB); a card with a
 * non-empty `photo_360` gets the "Фото 360" button, which opens `/360.php?photo_recid=<photo_recid>`. It is live
 * inventory, so each run replaces the table: panoramas that left the stock are deleted. No CSV seed — one request is
 * cheaper than shipping a file — the seed is only a snapshot so a fresh setup has data offline; run a live ingest to refresh it
 * (a live run deletes panoramas no longer in stock). robots.txt (checked 2026-10-08) only disallows `/check-vin` and some named bots.
 */
import { createDb, winner360 } from '@carplates/db'
import type { Winner360Insert } from '@carplates/db'
import { notInArray, sql } from 'drizzle-orm'

import { readCsv, writeCsv } from './csv-io.js'
import { parseCards } from './winner360-parse.js'

const ENDPOINT = 'https://stock.winner.ua/api.php?query=vehicles_group/any/any/any/any/any/any/any'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_TIMEOUT_MS = 60_000
const BATCH = 500

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const CSV_COLUMNS = [
  'photo_recid',
  'brand_slug',
  'model_slug',
  'brand',
  'model',
  'year',
  'version',
  'fuel',
  'photo_url',
  'fetched_at'
] as const

async function csvMode(exportPath?: string, fromPath?: string): Promise<void> {
  const { db, close } = createDb()
  try {
    if (exportPath) {
      const rows = await db.select().from(winner360).orderBy(winner360.photoRecid)
      const size = await writeCsv(
        exportPath,
        CSV_COLUMNS,
        rows.map(r => ({
          photo_recid: r.photoRecid,
          brand_slug: r.brandSlug,
          model_slug: r.modelSlug,
          brand: r.brand,
          model: r.model,
          year: r.year ?? '',
          version: r.version ?? '',
          fuel: r.fuel ?? '',
          photo_url: r.photoUrl,
          fetched_at: r.fetchedAt.toISOString()
        }))
      )
      log(`exported ${rows.length} panorama(s) to ${exportPath} (${(size / 1024).toFixed(0)} KB)`)
    } else if (fromPath) {
      const csv = await readCsv(fromPath)
      if (!csv) {
        log(`no seed CSV at ${fromPath} yet — skipped (run export:winner360:csv)`)
        return
      }
      const rows = csv.records.map((r): Winner360Insert => ({
        photoRecid: Number(r.photo_recid),
        brandSlug: r.brand_slug!,
        modelSlug: r.model_slug!,
        brand: r.brand!,
        model: r.model!,
        year: r.year ? Number(r.year) : null,
        version: r.version || null,
        fuel: r.fuel || null,
        photoUrl: r.photo_url!,
        fetchedAt: new Date(r.fetched_at!)
      }))
      for (let i = 0; i < rows.length; i += BATCH)
        await db
          .insert(winner360)
          .values(rows.slice(i, i + BATCH))
          .onConflictDoNothing()
      log(`imported ${rows.length} panorama(s) from ${csv.path}`)
    }
  } finally {
    await close()
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (argv.includes('--export-csv') || argv.includes('--from-csv')) {
    const valueOf = (flag: string): string | undefined =>
      argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined
    await csvMode(valueOf('--export-csv'), valueOf('--from-csv'))
    return
  }
  const dryRun = argv.includes('--dry-run')
  const res = await fetch(ENDPOINT, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`${ENDPOINT}: HTTP ${res.status}`)
  const { rows, skipped } = parseCards(await res.json())
  const makes = new Map<string, number>()
  for (const r of rows) makes.set(r.brand, (makes.get(r.brand) ?? 0) + 1)
  log(`${rows.length} interior panoramas (${skipped} skipped, brand unknown):`, Object.fromEntries(makes))
  if (dryRun || !rows.length) return

  const { db, close } = createDb()
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      await db
        .insert(winner360)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: winner360.photoRecid,
          set: {
            brandSlug: sql`excluded.brand_slug`,
            modelSlug: sql`excluded.model_slug`,
            brand: sql`excluded.brand`,
            model: sql`excluded.model`,
            year: sql`excluded.year`,
            version: sql`excluded.version`,
            fuel: sql`excluded.fuel`,
            photoUrl: sql`excluded.photo_url`,
            fetchedAt: sql`now()`
          }
        })
    }
    // Left the stock since the last run. Guarded by `rows.length` above, so an empty response never wipes the table.
    const gone = await db
      .delete(winner360)
      .where(
        notInArray(
          winner360.photoRecid,
          rows.map(r => r.photoRecid!)
        )
      )
      .returning({ id: winner360.photoRecid })
    log(`upserted ${rows.length}, removed ${gone.length} that left the stock`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
