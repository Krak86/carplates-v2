/**
 * Automatic ingest of the data.gov.ua vehicle-registration dataset.
 *
 *   pnpm ingest                     # every CKAN resource not already loaded
 *   pnpm ingest --year 2026         # just that year's resource
 *   pnpm ingest --year 2026 --limit 100000   # fast local slice
 *   pnpm ingest --file ./x.csv --year 2026    # a local CSV you already have
 *   pnpm ingest --dry-run           # parse + count, write nothing
 *
 * Source layout changes between years: 19 columns (no VIN) vs 20 (VIN after
 * model). Files are ';'-delimited, historically Windows-1251, usually
 * headerless. All of that is detected per file.
 */
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parse } from 'csv-parse'
import { sql } from 'drizzle-orm'
import iconv from 'iconv-lite'
import unzipper from 'unzipper'

import { createDb, ingestedResources, refreshCurrentRegistration, registrations } from '@carplates/db'
import type { Db, RegistrationInsert } from '@carplates/db'
import { looksLikeHeader, mapRecord } from './transform.js'

const CKAN_PACKAGE = '06779371-308f-42d7-895e-5a39833375f0'
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${CKAN_PACKAGE}`
const DATA_DIR = join(import.meta.dirname, '..', '.data')
const BATCH = 2000

interface Args {
  year?: number
  limit?: number
  file?: string
  dryRun: boolean
  utf8: boolean
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, utf8: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--year') a.year = Number(argv[++i])
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--file') a.file = argv[++i]
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--utf8') a.utf8 = true
  }
  return a
}

interface CkanResource {
  id: string
  name: string
  url: string
  format: string
  last_modified: string | null
  created: string | null
}

async function fetchResources(): Promise<CkanResource[]> {
  const res = await fetch(CKAN_URL)
  if (!res.ok) throw new Error(`CKAN ${res.status}`)
  const json = (await res.json()) as { result?: { resources?: CkanResource[] } }
  return (json.result?.resources ?? []).filter(r => /zip/i.test(r.format))
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function downloadZip(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`download ${res.status} for ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

async function* csvRecords(input: NodeJS.ReadableStream, utf8: boolean): AsyncGenerator<string[]> {
  const decoded = utf8 ? input : input.pipe(iconv.decodeStream('win1251'))
  const parser = decoded.pipe(parse({ delimiter: ';', relax_column_count: true, skip_empty_lines: true, trim: true }))
  let first = true
  for await (const rec of parser as AsyncIterable<string[]>) {
    if (first) {
      first = false
      if (looksLikeHeader(rec)) continue
    }
    yield rec
  }
}

async function ingestCsv(db: Db, records: AsyncIterable<string[]>, resourceId: string, args: Args): Promise<number> {
  let batch: RegistrationInsert[] = []
  let count = 0
  const flush = async (): Promise<void> => {
    if (!batch.length) return
    if (!args.dryRun) await db.insert(registrations).values(batch).onConflictDoNothing()
    batch = []
  }
  for await (const rec of records) {
    const row = mapRecord(rec, resourceId)
    if (!row) continue
    batch.push(row)
    count++
    if (batch.length >= BATCH) await flush()
    if (args.limit && count >= args.limit) break
  }
  await flush()
  return count
}

async function processResource(db: Db, r: CkanResource, args: Args): Promise<void> {
  const existing = (
    await db.execute<{ last_modified: string | null }>(
      sql`SELECT last_modified FROM registry.ingested_resources WHERE ckan_resource_id = ${r.id}`
    )
  ).rows[0]
  if (existing && String(existing.last_modified) === String(r.last_modified) && !args.limit) {
    log(`skip ${r.name} (${r.id}) — already ingested`)
    return
  }

  await mkdir(DATA_DIR, { recursive: true })
  const zipPath = join(DATA_DIR, `${r.id}.zip`)
  log(`downloading ${r.name} …`)
  await downloadZip(r.url, zipPath)

  const dir = await unzipper.Open.file(zipPath)
  const csvEntry = dir.files.find(f => /\.csv$/i.test(f.path))
  if (!csvEntry) throw new Error(`no .csv inside ${r.name}`)

  log(`parsing ${csvEntry.path} …`)
  const inserted = await ingestCsv(db, csvRecords(csvEntry.stream(), args.utf8), r.id, args)

  if (!args.dryRun) {
    await refreshCurrentRegistration(db)
    await db
      .insert(ingestedResources)
      .values({
        ckanResourceId: r.id,
        name: r.name,
        url: r.url,
        lastModified: r.last_modified ? new Date(r.last_modified) : null,
        rowCount: inserted
      })
      .onConflictDoUpdate({
        target: ingestedResources.ckanResourceId,
        set: {
          lastModified: r.last_modified ? new Date(r.last_modified) : null,
          rowCount: inserted,
          ingestedAt: new Date()
        }
      })
  }
  log(`${args.dryRun ? '[dry-run] would insert' : 'inserted'} ${inserted} rows from ${r.name}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.file) {
      const id = `file:${args.file}`
      const inserted = await ingestCsv(db, csvRecords(createReadStream(args.file), args.utf8), id, args)
      if (!args.dryRun) await refreshCurrentRegistration(db)
      log(`${args.dryRun ? '[dry-run] would insert' : 'inserted'} ${inserted} rows from ${args.file}`)
      return
    }

    let resources = await fetchResources()
    if (args.year) resources = resources.filter(r => r.name.includes(String(args.year)))
    if (resources.length === 0) {
      log('no matching CKAN resources')
      return
    }
    for (const r of resources) await processResource(db, r, args)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
