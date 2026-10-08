/**
 * Winner Imports (stock.winner.ua) interior 360° panoramas into `registry.winner_360`, so a result card's 360° modal can
 * offer an "Alt. interior" tab (see PLAN.md). Facts + links only — the viewer is Winner's own `/360.php` page.
 *
 *   pnpm ingest:winner360             # ONE request to the dealer's public JSON endpoint -> rows (replaces the whole set)
 *   pnpm ingest:winner360 -- --dry-run    # fetch + parse + print a summary, write nothing
 *
 * The stock page builds its cards from `api.php?query=vehicles_group/any/…` (all ~185 cards, ~200 KB); a card with a
 * non-empty `photo_360` gets the "Фото 360" button, which opens `/360.php?photo_recid=<photo_recid>`. It is live
 * inventory, so each run replaces the table: panoramas that left the stock are deleted. No CSV seed — one request is
 * cheaper than shipping a file. robots.txt (checked 2026-10-08) only disallows `/check-vin` and some named bots.
 */
import { createDb, winner360 } from '@carplates/db'
import { notInArray, sql } from 'drizzle-orm'

import { parseCards } from './winner360-parse.js'

const ENDPOINT = 'https://stock.winner.ua/api.php?query=vehicles_group/any/any/any/any/any/any/any'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const REQUEST_TIMEOUT_MS = 60_000
const BATCH = 500

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
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
