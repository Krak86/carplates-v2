/**
 * Adds the reason behind a SETAM lot: the debt category, issuing body and bailiff office of its enforcement proceeding, read from the
 * Unified Register of Debtors (Ministry of Justice, data.gov.ua `506734bf-…`, CC BY) into `registry.auction_proceedings`. The register
 * is one ~800 MB ZIP (4.5 GB CSV, 11 M rows, windows-1251) of OPEN proceedings only; it is streamed once and only rows whose proceeding
 * number belongs to a lot in `registry.auction_lots` are kept. Debtor names, birth dates, tax ids and bailiff contacts are never
 * read into a row. Rows are upserted and never deleted (a closed proceeding drops out of the register but keeps its last category),
 * so run it often enough that a lot's proceeding is seen while it is open: weekly is plenty.
 *
 *   pnpm ingest:auction-proceedings                 # resolve via CKAN + download + stream + upsert
 *   pnpm ingest:auction-proceedings --dry-run       # print counts, write nothing
 *   pnpm ingest:auction-proceedings --file ./x.zip  # use a local copy of the ZIP
 */
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { auctionLots, auctionProceedings, createDb } from '@carplates/db'
import type { AuctionProceedingInsert, Db } from '@carplates/db'
import { count, isNotNull, sql } from 'drizzle-orm'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import unzipper from 'unzipper'
import { z } from 'zod'

import { proceedingOfLine, toProceedingInsert } from './auction-proceedings-parse.js'

const DATASET = '506734bf-2480-448c-a2b4-90b6d06df11e'
const DATASET_PAGE = `https://data.gov.ua/dataset/${DATASET}`
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${DATASET}`
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 1000
/** The register has ~11.6 M rows; far fewer means a truncated download. */
const MIN_ROWS = 5_000_000

const PackageSchema = z.object({
  success: z.boolean(),
  result: z.object({
    resources: z.array(z.object({ url: z.string(), format: z.string().nullish(), last_modified: z.string().nullish() }))
  })
})

type Args = { dryRun: boolean; file?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true
    else if (argv[i] === '--file') a.file = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function resolveZipUrl(): Promise<string> {
  const res = await fetch(CKAN_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${CKAN_URL}: HTTP ${res.status} (dataset page: ${DATASET_PAGE})`)
  const pkg = PackageSchema.parse(await res.json())
  const zips = pkg.result.resources
    .filter(r => /\.zip$/i.test(r.url))
    .sort((a, b) => (b.last_modified ?? '').localeCompare(a.last_modified ?? ''))
  if (!zips[0]) throw new Error(`no ZIP resource in the dataset package (${DATASET_PAGE})`)
  return zips[0].url
}

async function download(url: string, to: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(to))
}

/** Streams the CSV inside the ZIP and collects the first row of every wanted proceeding. */
async function collect(
  zipPath: string,
  wanted: ReadonlySet<string>
): Promise<{ rows: number; found: Map<string, AuctionProceedingInsert> }> {
  const dir = await unzipper.Open.file(zipPath)
  const entry = dir.files.find(f => /\.csv$/i.test(f.path))
  if (!entry) throw new Error(`${zipPath}: no CSV inside`)
  // latin1 keeps one byte per char, so the cheap pre-filter below never decodes; only a matched line is decoded as windows-1251.
  const lines = createInterface({ input: entry.stream().setEncoding('latin1'), crlfDelay: Infinity })
  const cp1251 = new TextDecoder('windows-1251')
  const found = new Map<string, AuctionProceedingInsert>()
  let rows = 0
  for await (const raw of lines) {
    rows++
    const no = proceedingOfLine(raw)
    if (!no || !wanted.has(no) || found.has(no)) continue
    const row = toProceedingInsert(cp1251.decode(Buffer.from(raw, 'latin1')))
    if (row) found.set(no, row)
  }
  return { rows, found }
}

const tableCount = async (db: Db): Promise<number> =>
  (await db.select({ n: count() }).from(auctionProceedings))[0]?.n ?? 0

async function save(db: Db, rows: AuctionProceedingInsert[]): Promise<void> {
  const before = await tableCount(db)
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(auctionProceedings)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: auctionProceedings.proceedingNo,
        set: {
          category: sql`excluded.category`,
          issuer: sql`excluded.issuer`,
          bailiffOffice: sql`excluded.bailiff_office`,
          updatedAt: sql`now()`
        },
        // An unchanged row is left alone (`updated_at` stays the last real change).
        setWhere: sql`(auction_proceedings.category, auction_proceedings.issuer, auction_proceedings.bailiff_office)
          is distinct from (excluded.category, excluded.issuer, excluded.bailiff_office)`
      })
  }
  const after = await tableCount(db)
  log(`upserted ${rows.length} proceeding(s): ${after - before} new, ${after} in the table`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  let tmp: string | null = null
  try {
    const wanted = new Set(
      (
        await db.select({ no: auctionLots.proceedingNo }).from(auctionLots).where(isNotNull(auctionLots.proceedingNo))
      ).map(r => r.no as string)
    )
    log(`${wanted.size} distinct proceeding number(s) in auction_lots`)

    let zipPath = args.file
    if (!zipPath) {
      tmp = await mkdtemp(join(tmpdir(), 'erb-'))
      zipPath = join(tmp, 'erb.zip')
      const url = await resolveZipUrl()
      log(`downloading ${url}`)
      await download(url, zipPath)
    }

    const { rows, found } = await collect(zipPath, wanted)
    log(`${rows} register row(s) read, ${found.size} of ${wanted.size} proceeding(s) found`)
    if (!args.file && rows < MIN_ROWS) throw new Error(`only ${rows} rows (< ${MIN_ROWS}) - download looks truncated`)
    if (args.dryRun) return
    await save(db, [...found.values()])
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true })
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
