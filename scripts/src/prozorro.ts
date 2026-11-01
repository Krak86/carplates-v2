/**
 * Loads Prozorro.Sale auctions of vehicles (plate or VIN known) into `registry.prozorro_auctions` from the public search feed
 * `procedure.prozorro.sale/api/search/byDateModified` (about 700 modified auctions a day, 100 per request). Parsing and the
 * vehicle / identifier test live in `prozorro-parse.ts`, paging and retries in `prozorro-feed.ts`. An auction is upserted on its
 * full ID when the feed's `dateModified` is newer than the stored one; rows are never deleted. The cursor is the newest stored
 * `source_modified_at` minus one day, so the daily job needs no flag. See docs/prozorro-sale-auctions-plan.md.
 *
 *   pnpm ingest:prozorro                                  # since the newest stored change - 1 day (30 days when the table is empty)
 *   pnpm ingest:prozorro --from 2025-11-01                # backfill from a date (resumable: rerun with a later --from)
 *   pnpm ingest:prozorro --from 2025-11-01 --to 2025-12-01
 *   pnpm ingest:prozorro --from 2026-10-01 --dry-run      # read and parse, write nothing (no DB needed with --from)
 */
import { createDb, prozorroAuctions } from '@carplates/db'
import type { Db } from '@carplates/db'
import { count, getTableColumns, max, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import { crawlFeed, feedPageUrl, fetchJsonRetry } from './prozorro-feed.js'
import type { FeedStats } from './prozorro-feed.js'
import { PROZORRO_REJECT_REASONS, toProzorroAuctionInsert } from './prozorro-parse.js'
import type { ProzorroAuctionRowInput, ProzorroRejectReason } from './prozorro-parse.js'

const BATCH = 200
const DAY_MS = 86_400_000
/** Window of an empty-table run without `--from`: about 70 s of crawling. */
const DEFAULT_DAYS = 30

type Args = { dryRun: boolean; from?: Date; to: Date }

const log = (...m: unknown[]): void => {
  console.log(...m)
}

function dateArg(name: string, value: string | undefined): Date {
  const d = value ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) throw new Error(`${name}: expected a date like 2026-10-01, got "${value ?? ''}"`)
  return d
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, to: new Date() }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--from') a.from = dateArg('--from', argv[++i])
    else if (arg === '--to') a.to = dateArg('--to', argv[++i])
  }
  return a
}

/** ISO instant → the feed's cursor form (26 chars, microseconds, no `Z`). */
const asCursor = (d: Date): string => `${d.toISOString().slice(0, 23)}000`

async function defaultFrom(db: Db): Promise<Date> {
  const newest = (await db.select({ at: max(prozorroAuctions.sourceModifiedAt) }).from(prozorroAuctions))[0]?.at
  return new Date((newest ? newest.getTime() : Date.now() - DEFAULT_DAYS * DAY_MS) - (newest ? DAY_MS : 0))
}

const rowCount = async (db: Db): Promise<number> => (await db.select({ n: count() }).from(prozorroAuctions))[0]?.n ?? 0

/** Every column but the key and `first_seen_at` takes the incoming value. */
const UPDATE_SET: Record<string, SQL> = {
  ...Object.fromEntries(
    Object.entries(getTableColumns(prozorroAuctions))
      .filter(([key]) => key !== 'auctionId' && key !== 'firstSeenAt')
      .map(([key, col]) => [key, sql.raw(`excluded.${col.name}`)])
  ),
  updatedAt: sql`now()`
}

/** Upserts the rows; a row only replaces a stored one that is older. Returns how many were new / replaced. */
async function save(db: Db, rows: ProzorroAuctionRowInput[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const written = await db
      .insert(prozorroAuctions)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: prozorroAuctions.auctionId,
        set: UPDATE_SET,
        setWhere: sql`${prozorroAuctions.sourceModifiedAt} < excluded.source_modified_at`
      })
      // xmax is 0 on a freshly inserted tuple; a row left alone by `setWhere` is not returned at all.
      .returning({ isNew: sql<boolean>`(xmax = 0)` })
    for (const w of written) {
      if (w.isNew) inserted++
      else updated++
    }
  }
  return { inserted, updated }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const needsDb = !args.dryRun || !args.from
  const conn = needsDb ? createDb() : null
  try {
    const from = args.from ?? (conn ? await defaultFrom(conn.db) : new Date(Date.now() - DEFAULT_DAYS * DAY_MS))
    if (from.getTime() >= args.to.getTime()) throw new Error(`--from ${from.toISOString()} is not before --to`)
    log(`feed ${from.toISOString()} -> ${args.to.toISOString()}${args.dryRun ? ' (dry run)' : ''}`)

    const stats: FeedStats = { pages: 0, records: 0 }
    const newest = new Map<string, ProzorroAuctionRowInput>()
    const rejected = Object.fromEntries(PROZORRO_REJECT_REASONS.map(r => [r, 0])) as Record<
      ProzorroRejectReason,
      number
    >
    let vehicleLike = 0
    let withIdentifier = 0
    let multiVehicle = 0
    const started = Date.now()
    for await (const raw of crawlFeed(
      cursor => fetchJsonRetry(feedPageUrl(cursor)),
      asCursor(from),
      args.to.toISOString(),
      stats
    )) {
      const res = toProzorroAuctionInsert(raw)
      if (!res.ok) {
        rejected[res.reason]++
        if (res.reason === 'no-identifier') vehicleLike++
        continue
      }
      vehicleLike++
      withIdentifier++
      if (res.vehicles > 1) multiVehicle++
      const prev = newest.get(res.row.auctionId)
      if (!prev || prev.sourceModifiedAt < res.row.sourceModifiedAt) newest.set(res.row.auctionId, res.row)
    }

    // A window of a few hours can be quiet; a day or more without a single record means the feed (or our paging) is broken.
    if (stats.records === 0 && args.to.getTime() - from.getTime() > DAY_MS)
      throw new Error('the feed returned no records')

    const rows = [...newest.values()]
    const reasons = PROZORRO_REJECT_REASONS.map(r => `${r} ${rejected[r]}`).join(', ')
    log(
      `${stats.pages} page(s) in ${((Date.now() - started) / 1000).toFixed(1)} s: ${stats.records} record(s), ${vehicleLike} vehicle-like, ` +
        `${withIdentifier} with a plate or VIN (${multiVehicle} with several vehicles, first one kept) -> ${rows.length} distinct auction(s); rejected: ${reasons}`
    )
    if (args.dryRun || !conn) return

    const before = await rowCount(conn.db)
    const { inserted, updated } = await save(conn.db, rows)
    const after = await rowCount(conn.db)
    log(
      `${inserted} inserted, ${updated} updated, ${rows.length - inserted - updated} unchanged; ${before} -> ${after} row(s) in the table`
    )
  } finally {
    await conn?.close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
