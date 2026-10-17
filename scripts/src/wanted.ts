/**
 * Loads the National Police list of vehicles wanted for unlawful taking (open data, CC BY, data.gov.ua) into
 * `registry.wanted_vehicles`. The feed lists only CURRENT records, so records are upserted and never deleted: one that is no
 * longer in the feed gets `resolved_at` (found, or the search was cancelled). Run it at least daily (the feed changes several
 * times a day) — history only accumulates while it runs. Live data, not part of the seed CSVs.
 *
 *   pnpm ingest:wanted                  # download + upsert + mark the missing ones resolved
 *   pnpm ingest:wanted --dry-run        # download + print counts, write nothing
 *   pnpm ingest:wanted --file ./x.json  # use a local copy of CarsWanted.json
 */
import { readFile } from 'node:fs/promises'

import { createDb, wantedVehicles } from '@carplates/db'
import type { Db } from '@carplates/db'
import { and, eq, isNull, lt, sql } from 'drizzle-orm'

import { toWantedInsert } from './wanted-parse.js'
import type { WantedFeedRow } from './wanted-parse.js'

const DATASET_PAGE = 'https://data.gov.ua/dataset/2cd12755-834b-4c43-9026-fe356ce93af5'
const FEED_URL =
  'https://data.gov.ua/dataset/2cd12755-834b-4c43-9026-fe356ce93af5/resource/2d69d196-02f1-49b9-97fa-0fb69077e05f/download/carswanted.json'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 1000
/** A feed this small is a broken export, not a real list: refuse to mark everything else "removed". */
const MIN_ROWS = 20_000

type Row = NonNullable<ReturnType<typeof toWantedInsert>>

type Args = { dryRun: boolean; file?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--file') a.file = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function readFeed(file?: string): Promise<WantedFeedRow[]> {
  let body: string
  if (file) {
    body = await readFile(file, 'utf8')
  } else {
    log(`downloading ${FEED_URL}`)
    const res = await fetch(FEED_URL, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`${FEED_URL}: HTTP ${res.status} (dataset page: ${DATASET_PAGE})`)
    body = await res.text()
  }
  const data: unknown = JSON.parse(body)
  if (!Array.isArray(data)) throw new Error('feed is not a JSON array')
  return data as WantedFeedRow[]
}

async function save(db: Db, rows: Row[]): Promise<void> {
  // Rows seen in this run get last_seen_at = runStart; anything older that is still open has left the feed.
  const runStart = new Date()

  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(wantedVehicles)
      .values(rows.slice(i, i + BATCH).map(r => ({ ...r, lastSeenAt: runStart })))
      .onConflictDoUpdate({
        target: wantedVehicles.sourceId,
        set: {
          plate: sql`excluded.plate`,
          vin: sql`excluded.vin`,
          vinAlt: sql`excluded.vin_alt`,
          brand: sql`excluded.brand`,
          model: sql`excluded.model`,
          vehicleType: sql`excluded.vehicle_type`,
          color: sql`excluded.color`,
          seizedAt: sql`excluded.seized_at`,
          registeredAt: sql`excluded.registered_at`,
          organUnit: sql`excluded.organ_unit`,
          region: sql`excluded.region`,
          lastSeenAt: runStart,
          resolvedAt: null
        }
      })
  }

  const resolved = await db
    .update(wantedVehicles)
    .set({ resolvedAt: runStart })
    .where(
      and(eq(wantedVehicles.source, 'feed'), isNull(wantedVehicles.resolvedAt), lt(wantedVehicles.lastSeenAt, runStart))
    )
    .returning({ sourceId: wantedVehicles.sourceId })
  log(`upserted ${rows.length} record(s); ${resolved.length} left the feed and were marked resolved`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const feed = await readFeed(args.file)
  const rows = feed.map(toWantedInsert).filter((r): r is Row => r !== null)
  // The same id can repeat in the feed; one INSERT cannot touch a row twice.
  const unique = [...new Map(rows.map(r => [r.sourceId, r])).values()]
  log(
    `feed: ${feed.length} record(s), ${unique.length} usable, ${unique.filter(r => r.plate).length} with a plate, ${unique.filter(r => r.vin).length} with a VIN`
  )
  if (unique.length < MIN_ROWS)
    throw new Error(`only ${unique.length} usable records (< ${MIN_ROWS}) — feed looks broken`)
  if (args.dryRun) return

  const { db, close } = createDb()
  try {
    await save(db, unique)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
