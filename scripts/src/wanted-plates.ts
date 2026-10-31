/**
 * Loads the National Police list of wanted licence PLATES ("Garpun", open data, CC BY, data.gov.ua `licplatewanted`) into
 * `registry.wanted_plates`. Not the same list as `wanted.ts` (a vehicle is wanted): here only the plate is. The feed lists only
 * CURRENT records, so records are upserted and never deleted: one that is no longer in the feed gets `resolved_at`. Run it daily —
 * history only accumulates while it runs. Live data, not part of the seed CSVs.
 *
 *   pnpm ingest:wanted-plates                  # resolve via CKAN + download + upsert + mark the missing ones resolved
 *   pnpm ingest:wanted-plates --dry-run        # download + print counts, write nothing
 *   pnpm ingest:wanted-plates --file ./x.json  # use a local copy of LicplateWanted.json
 */
import { readFile } from 'node:fs/promises'

import { createDb, wantedPlates } from '@carplates/db'
import type { Db } from '@carplates/db'
import { and, isNull, lt, sql } from 'drizzle-orm'
import { z } from 'zod'

import { toWantedPlateInsert, WantedPlateFeedRowSchema } from './wanted-plates-parse.js'

const DATASET = 'licplatewanted'
const DATASET_PAGE = `https://data.gov.ua/dataset/${DATASET}`
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${DATASET}`
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 1000
/** A feed this small is a broken export (the real list has ~20 000): refuse to mark everything else "resolved". */
const MIN_ROWS = 5000

const PackageSchema = z.object({
  success: z.boolean(),
  result: z.object({
    resources: z.array(z.object({ url: z.string(), name: z.string().nullish(), format: z.string().nullish() }))
  })
})

type Row = NonNullable<ReturnType<typeof toWantedPlateInsert>>

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

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} (dataset page: ${DATASET_PAGE})`)
  return res
}

/** The data file's URL from CKAN (the package also lists a `…_schema.json`; resource ids / URLs can change, never hard-code them). */
async function resolveFeedUrl(): Promise<string> {
  const pkg = PackageSchema.parse(await (await fetchOk(CKAN_URL)).json())
  const data = pkg.result.resources.find(r => /\.json$/i.test(r.url) && !/schema/i.test(r.url))
  if (!data) throw new Error(`no data resource in the ${DATASET} package (${DATASET_PAGE})`)
  return data.url
}

async function readFeed(file?: string): Promise<unknown[]> {
  let body: string
  if (file) {
    body = await readFile(file, 'utf8')
  } else {
    const url = await resolveFeedUrl()
    log(`downloading ${url}`)
    body = await (await fetchOk(url)).text()
  }
  const data: unknown = JSON.parse(body)
  if (!Array.isArray(data)) throw new Error('feed is not a JSON array')
  return data
}

async function save(db: Db, rows: Row[]): Promise<void> {
  // Rows seen in this run get last_seen_at = runStart; anything older that is still open has left the feed.
  const runStart = new Date()

  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(wantedPlates)
      .values(rows.slice(i, i + BATCH).map(r => ({ ...r, lastSeenAt: runStart })))
      .onConflictDoUpdate({
        target: wantedPlates.sourceId,
        set: {
          plate: sql`excluded.plate`,
          seizedAt: sql`excluded.seized_at`,
          insertedAt: sql`excluded.inserted_at`,
          organUnit: sql`excluded.organ_unit`,
          region: sql`excluded.region`,
          lastSeenAt: runStart,
          resolvedAt: null
        }
      })
  }

  const resolved = await db
    .update(wantedPlates)
    .set({ resolvedAt: runStart })
    .where(and(isNull(wantedPlates.resolvedAt), lt(wantedPlates.lastSeenAt, runStart)))
    .returning({ sourceId: wantedPlates.sourceId })
  log(`upserted ${rows.length} record(s); ${resolved.length} left the feed and were marked resolved`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const feed = await readFeed(args.file)
  const now = new Date()
  const rows: Row[] = []
  let invalid = 0
  for (const raw of feed) {
    const parsed = WantedPlateFeedRowSchema.safeParse(raw)
    if (!parsed.success) {
      invalid++
      continue
    }
    const row = toWantedPlateInsert(parsed.data, now)
    if (row) rows.push(row)
  }
  // The same id can repeat in the feed; one INSERT cannot touch a row twice.
  const unique = [...new Map(rows.map(r => [r.sourceId, r])).values()]
  log(
    `feed: ${feed.length} record(s), ${unique.length} usable (${feed.length - rows.length - invalid} without id/plate, ${invalid} invalid), ${new Set(unique.map(r => r.plate)).size} distinct plates, ${unique.filter(r => r.region).length} with a region`
  )
  if (unique.length < MIN_ROWS)
    throw new Error(`only ${unique.length} usable records (< ${MIN_ROWS}) - feed looks broken`)
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
