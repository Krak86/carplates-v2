/**
 * Automatic ingest of the data.gov.ua vehicle-registration dataset.
 *
 *   pnpm ingest                         # every CKAN resource not already loaded
 *   pnpm ingest --year 2026             # just that year's resource
 *   pnpm ingest --year 2026 --limit 100000   # fast local slice
 *   pnpm ingest --file ./x.csv --year 2026   # a local CSV you already have
 *   pnpm ingest --dry-run               # parse + count, write nothing
 *   pnpm ingest --archive ./backups     # keep a copy of every downloaded ZIP
 *   pnpm ingest --backfill-plates       # reconstruct plate for 2026+ rows (see backfill.ts)
 *   pnpm ingest --year 2026 --after 2026-05-01   # skip rows already covered by an archived snapshot
 *
 * Source layout changes every few years — different columns, different order,
 * different date formats, and as of the 2026-09-01 resource no plate column at
 * all (ГСЦ МВС order №67/ОД, 2026-06-29). Column mapping is header-name-driven
 * (transform.ts); a file whose header matches no known column throws instead of
 * silently inserting zero rows. Encoding defaults to UTF-8 — every year 2013
 * through 2026 verified against the real files is UTF-8, not win1251.
 *
 * 2026 plate recovery: the live reestrTZ2026 resource lost its plate column
 * sometime between the May 1 and June 23 2026 revisions (data.gov.ua's own
 * cutover ran ahead of the ГСЦ МВС order's 2026-06-29 effective date). The
 * last with-plate snapshot is recoverable from data.gov.ua's revision history
 * (not the CKAN package_show API) — see scripts/.data/archive/ and PLAN.md.
 * Ingest that archived snapshot once via --file, then ingest the live resource
 * with --after 2026-05-01 to skip the now-redundant already-plated months, then
 * run --backfill-plates to reconstruct plates for everything from May onward.
 */
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parse } from 'csv-parse'
import { sql } from 'drizzle-orm'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import iconv from 'iconv-lite'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import unzipper from 'unzipper'
import type { File as ZipFile } from 'unzipper'

import { createDb, ingestedResources, refreshCurrentRegistration, refreshStats, registrations } from '@carplates/db'
import type { Db, RegistrationInsert } from '@carplates/db'
import { backfillPlates } from './backfill.js'
import { buildLayout, looksLikeHeader, mapRecord } from './transform.js'
import type { Layout } from './transform.js'

const CKAN_PACKAGE = '06779371-308f-42d7-895e-5a39833375f0'
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${CKAN_PACKAGE}`
const DATA_DIR = join(import.meta.dirname, '..', '.data')
const BATCH = 2000
const PROGRESS_EVERY = 50000

type Encoding = 'utf8' | 'win1251'

interface Args {
  year?: number
  limit?: number
  file?: string
  dryRun: boolean
  encoding: Encoding
  archive?: string
  backfillPlates: boolean
  /** Skip mapped rows with `d_reg` before this ISO date — already covered by an archived snapshot. */
  after?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, encoding: 'utf8', backfillPlates: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--year') a.year = Number(argv[++i])
    else if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--file') a.file = argv[++i]
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--archive') a.archive = argv[++i]
    else if (arg === '--backfill-plates') a.backfillPlates = true
    else if (arg === '--after') {
      const v = argv[++i]
      if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v))
        throw new Error(`--after must be an ISO date (YYYY-MM-DD), got "${String(v)}"`)
      a.after = v
    } else if (arg === '--encoding') {
      const v = argv[++i]
      if (v !== 'utf8' && v !== 'win1251') throw new Error(`--encoding must be "utf8" or "win1251", got "${String(v)}"`)
      a.encoding = v
    }
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

/** CKAN's own resource order is incidental (an API/listing artifact), not chronological. */
const resourceYear = (name: string): number => Number(/(\d{4})/.exec(name)?.[1] ?? 0)

/**
 * Chronological by year, oldest first. Some years (e.g. 2022) carry several
 * resources under the same name — superseded same-day republishes the portal
 * never cleaned up — so `created` breaks the tie, oldest first.
 */
const sortResourcesChronologically = (resources: CkanResource[]): CkanResource[] =>
  [...resources].sort((a, b) => {
    const yearDiff = resourceYear(a.name) - resourceYear(b.name)
    return yearDiff !== 0 ? yearDiff : (a.created ?? '').localeCompare(b.created ?? '')
  })

const log = (...m: unknown[]): void => {
  console.log(...m)
}

/** Safe for a Windows or POSIX filename — CKAN `last_modified` is an ISO timestamp with colons. */
const sanitizeForFilename = (s: string): string => s.replace(/[^A-Za-z0-9._-]+/g, '-')

async function downloadZip(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`download ${res.status} for ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

/**
 * Read the header row, resolve it to a `Layout`, and hand back a generator over
 * the remaining rows. Throws if row 1 doesn't look like a header at all, or if
 * `buildLayout` can't recognize any column in it — both mean this file's shape
 * is not one we know, and silently mis-mapping it is the exact failure mode
 * this rewrite exists to avoid.
 */
async function openCsv(
  input: NodeJS.ReadableStream,
  encoding: Encoding
): Promise<{ layout: Layout; records: AsyncGenerator<string[]> }> {
  const decoded = encoding === 'win1251' ? input.pipe(iconv.decodeStream('win1251')) : input
  const parser = decoded.pipe(
    parse({ delimiter: ';', relax_column_count: true, skip_empty_lines: true, trim: true })
  ) as AsyncIterable<string[]>
  const iterator = parser[Symbol.asyncIterator]()

  const first = await iterator.next()
  if (first.done) throw new Error('empty CSV — no header row')
  if (!looksLikeHeader(first.value)) {
    throw new Error(`expected a header row, got what looks like data: ${first.value.join(';')}`)
  }
  const layout = buildLayout(first.value)

  async function* records(): AsyncGenerator<string[]> {
    let checkedEncoding = false
    let r = await iterator.next()
    while (!r.done) {
      if (!checkedEncoding) {
        checkedEncoding = true
        if (r.value.some(v => v.includes('�'))) {
          throw new Error('decoded output contains U+FFFD (mojibake) — try the other --encoding (utf8 or win1251)')
        }
      }
      yield r.value
      r = await iterator.next()
    }
  }

  return { layout, records: records() }
}

/** Insert mapped rows in batches. Returns rows actually inserted (dedup-aware), or mapped rows in `--dry-run`. */
async function ingestCsv(
  db: Db,
  records: AsyncIterable<string[]>,
  layout: Layout,
  resourceId: string,
  args: Args
): Promise<number> {
  let batch: RegistrationInsert[] = []
  let mapped = 0
  let inserted = 0
  let lastLogged = 0
  const flush = async (): Promise<void> => {
    if (!batch.length) return
    if (!args.dryRun) {
      const rows = await db
        .insert(registrations)
        .values(batch)
        .onConflictDoNothing()
        .returning({ id: registrations.id })
      inserted += rows.length
    }
    batch = []
  }
  for await (const rec of records) {
    const row = mapRecord(rec, layout, resourceId)
    if (!row) continue
    if (args.after && row.dReg && row.dReg < args.after) continue
    batch.push(row)
    mapped++
    if (batch.length >= BATCH) await flush()
    if (mapped - lastLogged >= PROGRESS_EVERY) {
      log(`  … ${mapped} rows parsed so far (${args.dryRun ? mapped : inserted} inserted)`)
      lastLogged = mapped
    }
    if (args.limit && mapped >= args.limit) break
  }
  await flush()
  log(
    `  done: ${mapped} rows mapped, ${args.dryRun ? mapped : inserted} ${args.dryRun ? '(dry-run, not written)' : 'inserted'}`
  )
  return args.dryRun ? mapped : inserted
}

async function recordIngestedResource(
  db: Db,
  resourceId: string,
  name: string,
  url: string | null,
  lastModified: string | null,
  rowCount: number
): Promise<void> {
  const lastModifiedDate = lastModified ? new Date(lastModified) : null
  await db
    .insert(ingestedResources)
    .values({ ckanResourceId: resourceId, name, url, lastModified: lastModifiedDate, rowCount })
    .onConflictDoUpdate({
      target: ingestedResources.ckanResourceId,
      set: { lastModified: lastModifiedDate, rowCount, ingestedAt: new Date() }
    })
}

async function processResource(db: Db, r: CkanResource, args: Args): Promise<number> {
  const existing = (
    await db.execute<{ last_modified: string | null }>(
      sql`SELECT last_modified FROM registry.ingested_resources WHERE ckan_resource_id = ${r.id}`
    )
  ).rows[0]
  // Compare as timestamps, not strings — Postgres serializes the stored value
  // as "2019-01-09 08:11:28.6+00" while CKAN's raw field reads
  // "2019-01-09T10:11:28.600464"; those never match as text even when equal.
  const existingMs = existing?.last_modified ? new Date(existing.last_modified).getTime() : null
  const incomingMs = r.last_modified ? new Date(r.last_modified).getTime() : null
  if (existing && existingMs !== null && existingMs === incomingMs && !args.limit) {
    log(`skip ${r.name} (${r.id}) — already ingested`)
    return 0
  }

  await mkdir(DATA_DIR, { recursive: true })
  // Keyed by last_modified, not just the (stable) resource id — data.gov.ua
  // replaces a resource's file in place, so the old naming overwrote the
  // previous month's download the moment a resource was re-fetched. That is
  // exactly how the pre-№67/ОД January-2026 plates would have been lost.
  const cacheName = `${r.id}_${sanitizeForFilename(r.last_modified ?? 'unknown')}.zip`
  const zipPath = join(DATA_DIR, cacheName)
  // The name is keyed by last_modified, so a cache hit here means data.gov.ua's
  // copy is byte-identical to what's on disk — safe to skip re-downloading a
  // (re-)ingest of a resource already fetched in a previous run.
  if (existsSync(zipPath)) {
    log(`reusing cached ${r.name} (${cacheName})`)
  } else {
    log(`downloading ${r.name} …`)
    await downloadZip(r.url, zipPath)
    log(`done: downloaded ${r.name}`)
  }

  if (args.archive) {
    await mkdir(args.archive, { recursive: true })
    const archivePath = join(
      args.archive,
      `${sanitizeForFilename(r.name)}_${sanitizeForFilename(r.last_modified ?? 'unknown')}.zip`
    )
    await copyFile(zipPath, archivePath)
    log(`archived to ${archivePath}`)
  }

  const csvEntries = await resolveZipCsvEntries(zipPath, r.name)
  log(`done: unzipped ${r.name} — ${csvEntries.length} csv file(s)`)

  let inserted = 0
  for (const entry of csvEntries) {
    log(`parsing ${entry.path} …`)
    const { layout, records } = await openCsv(entry.stream(), args.encoding)
    inserted += await ingestCsv(db, records, layout, r.id, args)
    log(`done: parsed ${entry.path}`)
  }

  if (!args.dryRun) await recordIngestedResource(db, r.id, r.name, r.url, r.last_modified, inserted)
  log(`done: ${args.dryRun ? '[dry-run] would insert' : 'inserted'} ${inserted} rows from ${r.name}`)
  return inserted
}

/**
 * Resolve a downloaded ZIP's CSV entries, falling back to its sole file entry
 * when no name ends in ".csv" — some data.gov.ua ZIPs store the entry name in
 * an encoding unzipper doesn't expect (seen on reestrTZ2019: the "c" in
 * ".csv" decodes to U+FFFD). Every resource ZIP holds exactly one data file,
 * so that fallback is unambiguous rather than a guess among several candidates.
 */
async function resolveZipCsvEntries(zipPath: string, label: string): Promise<ZipFile[]> {
  const dir = await unzipper.Open.file(zipPath)
  const csvEntries = dir.files.filter(f => /\.csv$/i.test(f.path))
  if (csvEntries.length > 0) return csvEntries
  const fileEntries = dir.files.filter(f => f.type === 'File')
  const [only] = fileEntries
  if (fileEntries.length !== 1 || !only) throw new Error(`no .csv inside ${label}`)
  log(`warn: ${label} — no ".csv"-suffixed entry (mangled filename?); using its only file entry "${only.path}"`)
  return fileEntries
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.backfillPlates) {
      const result = await backfillPlates(db)
      log(`backfill: ${result.exactMatched} exact, ${result.vinFallback} vin-fallback, ${result.deduped} deduped`)
      log('refreshing current_registration view …')
      await refreshCurrentRegistration(db)
      log('refreshing stats rollups …')
      await refreshStats(db)
      log('done: current_registration + stats rollups refreshed')
      return
    }

    if (args.file) {
      const id = `file:${basename(args.file)}`
      let inserted = 0
      if (/\.zip$/i.test(args.file)) {
        const csvEntries = await resolveZipCsvEntries(args.file, args.file)
        log(`done: unzipped ${args.file} — ${csvEntries.length} csv file(s)`)
        for (const entry of csvEntries) {
          log(`parsing ${entry.path} …`)
          const { layout, records } = await openCsv(entry.stream(), args.encoding)
          inserted += await ingestCsv(db, records, layout, id, args)
          log(`done: parsed ${entry.path}`)
        }
      } else {
        const { layout, records } = await openCsv(createReadStream(args.file), args.encoding)
        inserted = await ingestCsv(db, records, layout, id, args)
      }
      if (!args.dryRun) {
        await recordIngestedResource(db, id, basename(args.file), null, null, inserted)
        log('refreshing current_registration view …')
        await refreshCurrentRegistration(db)
        log('refreshing stats rollups …')
        await refreshStats(db)
        log('done: current_registration + stats rollups refreshed')
      }
      log(`done: ${args.dryRun ? '[dry-run] would insert' : 'inserted'} ${inserted} rows from ${args.file}`)
      return
    }

    let resources = await fetchResources()
    if (args.year) resources = resources.filter(r => r.name.includes(String(args.year)))
    resources = sortResourcesChronologically(resources)
    if (resources.length === 0) {
      log('no matching CKAN resources')
      return
    }
    log(`found ${resources.length} matching resource(s): ${resources.map(r => r.name).join(', ')}`)
    for (const r of resources) await processResource(db, r, args)
    if (!args.dryRun) {
      log('refreshing current_registration view …')
      await refreshCurrentRegistration(db)
      log('refreshing stats rollups …')
      await refreshStats(db)
      log('done: current_registration + stats rollups refreshed')
    }
    log('done: ingest complete')
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
