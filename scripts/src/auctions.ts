/**
 * Loads SETAM auctions of seized / confiscated property (open data, CC BY, data.gov.ua dataset `eda4e3cf-…`) into
 * `registry.auction_lots`: only the car and truck lots, with plate / VIN / make / model / year parsed from the free-text title
 * (`auctions-parse.ts`). The dataset is one CSV per month; the same lot repeats across files as its status changes, so lots are
 * upserted on the lot number with the newest snapshot winning, and never deleted. Only the newest file changes daily, so the
 * daily job reads the newest two (the month rollover); `--all` backfills every file. The winner column is never read.
 *
 *   pnpm ingest:auctions                  # newest 2 files (by CKAN last_modified) + upsert
 *   pnpm ingest:auctions --files 3        # newest 3 files
 *   pnpm ingest:auctions --all            # full backfill (55 files, ~1 min)
 *   pnpm ingest:auctions --dry-run        # download + print counts, write nothing
 *   pnpm ingest:auctions --file ./x.csv   # use one local CSV
 */
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { auctionLots, createDb } from '@carplates/db'
import type { Db } from '@carplates/db'
import { count, sql } from 'drizzle-orm'
import { z } from 'zod'

import { parseAuctionCsv } from './auctions-parse.js'
import type { AuctionLotRowInput } from './auctions-parse.js'

const DATASET = 'eda4e3cf-0dda-46a1-a78a-ee264ebbfe97'
const DATASET_PAGE = `https://data.gov.ua/dataset/${DATASET}`
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${DATASET}`
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 1000
const DEFAULT_FILES = 2
/** The newest two months hold ~1 000 vehicle lots; far fewer means a broken export. */
const MIN_LOTS = 200

const PackageSchema = z.object({
  success: z.boolean(),
  result: z.object({
    resources: z.array(
      z.object({
        url: z.string(),
        name: z.string().nullish(),
        format: z.string().nullish(),
        last_modified: z.string().nullish(),
        created: z.string().nullish()
      })
    )
  })
})

type Args = { dryRun: boolean; all: boolean; files: number; file?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, all: false, files: DEFAULT_FILES }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--all') a.all = true
    else if (arg === '--files') a.files = Math.max(1, Number(argv[++i]) || DEFAULT_FILES)
    else if (arg === '--file') a.file = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} (dataset page: ${DATASET_PAGE})`)
  return res
}

type Resource = { url: string; sortKey: string }

/**
 * The CSV files, oldest snapshot first. Resource labels do not match the file names (`auctions-07.2026` is
 * `…31-08-2026.csv`) and URL order is not date order, so the order comes from CKAN's `last_modified`.
 */
async function listFiles(): Promise<Resource[]> {
  const pkg = PackageSchema.parse(await (await fetchOk(CKAN_URL)).json())
  const files = pkg.result.resources
    .filter(r => /\.csv$/i.test(r.url))
    .map(r => ({ url: r.url, sortKey: r.last_modified ?? r.created ?? '' }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  if (files.length === 0) throw new Error(`no CSV resource in the dataset package (${DATASET_PAGE})`)
  return files
}

const lotCount = async (db: Db): Promise<number> => (await db.select({ n: count() }).from(auctionLots))[0]?.n ?? 0

async function save(db: Db, lots: AuctionLotRowInput[]): Promise<void> {
  const before = await lotCount(db)

  for (let i = 0; i < lots.length; i += BATCH) {
    await db
      .insert(auctionLots)
      .values(lots.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: auctionLots.lotNo,
        set: {
          proceedingNo: sql`excluded.proceeding_no`,
          status: sql`excluded.status`,
          category: sql`excluded.category`,
          region: sql`excluded.region`,
          startPrice: sql`excluded.start_price`,
          salePrice: sql`excluded.sale_price`,
          titleRaw: sql`excluded.title_raw`,
          plate: sql`excluded.plate`,
          vin: sql`excluded.vin`,
          make: sql`excluded.make`,
          model: sql`excluded.model`,
          year: sql`excluded.year`,
          sourceFile: sql`excluded.source_file`,
          updatedAt: sql`now()`
        },
        // An unchanged lot is left alone (no dead tuple, `updated_at` stays the last real change).
        setWhere: sql`(auction_lots.status, auction_lots.start_price, auction_lots.sale_price, auction_lots.proceeding_no, auction_lots.region, auction_lots.title_raw, auction_lots.plate, auction_lots.vin, auction_lots.make, auction_lots.model, auction_lots.year)
          is distinct from (excluded.status, excluded.start_price, excluded.sale_price, excluded.proceeding_no, excluded.region, excluded.title_raw, excluded.plate, excluded.vin, excluded.make, excluded.model, excluded.year)`
      })
  }

  const after = await lotCount(db)
  log(`upserted ${lots.length} lot(s): ${after - before} new, ${after} in the table`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const now = new Date()

  // Oldest first, so a lot seen in several files ends up with its newest snapshot.
  const sources: { name: string; text: () => Promise<string> }[] = args.file
    ? [{ name: basename(args.file), text: () => readFile(args.file as string, 'utf8') }]
    : (await listFiles()).slice(args.all ? 0 : -args.files).map(r => ({
        name: basename(new URL(r.url).pathname),
        text: async () => (await fetchOk(r.url)).text()
      }))

  const byLot = new Map<number, AuctionLotRowInput>()
  let rows = 0
  let vehicleRows = 0
  let invalid = 0
  for (const source of sources) {
    const parsed = parseAuctionCsv(await source.text(), source.name, now)
    rows += parsed.rows
    vehicleRows += parsed.lots.length
    invalid += parsed.invalid
    for (const lot of parsed.lots) byLot.set(lot.lotNo, lot)
    log(
      `${source.name}: ${parsed.rows} row(s), ${parsed.lots.length} vehicle lot(s)${parsed.invalid ? `, ${parsed.invalid} invalid` : ''}`
    )
  }

  const lots = [...byLot.values()]
  const n = (pick: (l: AuctionLotRowInput) => unknown): number => lots.filter(pick).length
  log(
    `${sources.length} file(s): ${rows} row(s), ${vehicleRows} vehicle row(s) -> ${lots.length} distinct lot(s), ${invalid} invalid; ` +
      `${n(l => l.plate)} with a plate, ${n(l => l.vin)} with a VIN, ${n(l => !l.plate && !l.vin)} with neither, ` +
      `${n(l => l.make)} with a make, ${n(l => l.year)} with a year, ${n(l => l.salePrice)} sold`
  )
  if (!args.file && lots.length < MIN_LOTS)
    throw new Error(`only ${lots.length} vehicle lots (< ${MIN_LOTS}) - feed looks broken`)
  if (args.dryRun) return

  const { db, close } = createDb()
  try {
    await save(db, lots)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
