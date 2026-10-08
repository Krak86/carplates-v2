/**
 * Loads RDW (Dutch vehicle authority) specs into `registry.rdw_specs`: power, displacement, unladen mass and combined
 * CO2 as min / median / max per make/model/year. CC0 data from opendata.rdw.nl, aggregated by RDW's own SODA server
 * (a join of "Gekentekende voertuigen" m9d7-ebf2 and its fuel/emissions dataset 8ys7-d773 on kenteken) — never the
 * ~17M raw rows. One query per make, cached on disk in scripts/.data/rdw/ (gitignored).
 *
 *   pnpm ingest:rdw                          # every make with >= 50 vehicles, ~1 h cold, resumable from the cache
 *   pnpm ingest:rdw -- --make SKODA          # just one make (RDW spelling)
 *   pnpm ingest:rdw -- --min-vehicles 500    # bigger makes only
 *   pnpm ingest:rdw -- --dry-run             # query + count, write nothing
 *   pnpm ingest:rdw -- --refresh             # re-query even if cached
 *   pnpm ingest:rdw -- --export-csv ./x.csv[.gz]   # dump the current table
 *   pnpm ingest:rdw -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no download
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { RDW_MIN_N } from '@carplates/shared'
import { createDb, rdwSpecs } from '@carplates/db'
import type { Db, RdwSpecsInsert, RdwSpecsRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { dedupeByKey, makesQuery, MIN_YEAR, parseSpecsRecord, specsQuery } from './rdw-parse.js'

const QUERY_URL = 'https://opendata.rdw.nl/api/v3/views/m9d7-ebf2/query.json'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'rdw')
const BATCH = 1000
const DEFAULT_MIN_VEHICLES = 50
const QUERY_TIMEOUT_MS = 280_000
const RETRIES = 3

type Args = {
  dryRun: boolean
  refresh: boolean
  make?: string
  minVehicles: number
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false, minVehicles: DEFAULT_MIN_VEHICLES }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--make') a.make = argv[++i]
    else if (arg === '--min-vehicles') a.minVehicles = Number(argv[++i]) || DEFAULT_MIN_VEHICLES
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** SoQL over POST (the grouped query is too long for a URL), retried with a growing pause on 429/5xx/timeouts. */
async function soql(query: string): Promise<Record<string, unknown>[]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(QUERY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(QUERY_TIMEOUT_MS)
      })
      if (res.ok) return (await res.json()) as Record<string, unknown>[]
      const body = (await res.text()).slice(0, 300)
      // A malformed query will not heal by retrying.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new Error(`RDW ${res.status}: ${body}`)
      lastError = new Error(`RDW ${res.status}: ${body}`)
    } catch (err) {
      lastError = err
      if (err instanceof Error && err.message.startsWith('RDW 4') && !err.message.startsWith('RDW 429')) throw err
    }
    await sleep(attempt * 5000)
  }
  throw lastError
}

const cachePath = (name: string): string => join(DATA_DIR, `${name.replace(/[^A-Za-z0-9]+/g, '_')}.json`)

async function cached<T>(name: string, refresh: boolean, load: () => Promise<T>): Promise<T> {
  const path = cachePath(name)
  if (!refresh && existsSync(path)) return JSON.parse(await readFile(path, 'utf8')) as T
  const value = await load()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(value))
  return value
}

/** A whole make in one query; if RDW times out on a giant make (Volkswagen, Toyota …), one query per year instead. */
async function fetchMake(make: string, maxYear: number): Promise<Record<string, unknown>[]> {
  try {
    return await soql(specsQuery(make))
  } catch (err) {
    log(`  ${make}: whole-make query failed (${String(err).slice(0, 120)}) — retrying per year`)
    const out: Record<string, unknown>[] = []
    for (let year = MIN_YEAR; year <= maxYear; year++) out.push(...(await soql(specsQuery(make, year))))
    return out
  }
}

async function upsertAll(db: Db, rows: RdwSpecsInsert[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(rdwSpecs)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: [rdwSpecs.kind, rdwSpecs.makeKey, rdwSpecs.modelKey, rdwSpecs.modelYear],
        set: {
          make: sql`excluded.make`,
          model: sql`excluded.model`,
          n: sql`excluded.n`,
          powerKwMin: sql`excluded.power_kw_min`,
          powerKwMedian: sql`excluded.power_kw_median`,
          powerKwMax: sql`excluded.power_kw_max`,
          displacementCcMin: sql`excluded.displacement_cc_min`,
          displacementCcMedian: sql`excluded.displacement_cc_median`,
          displacementCcMax: sql`excluded.displacement_cc_max`,
          massKgMin: sql`excluded.mass_kg_min`,
          massKgMedian: sql`excluded.mass_kg_median`,
          massKgMax: sql`excluded.mass_kg_max`,
          co2GKmMin: sql`excluded.co2_g_km_min`,
          co2GKmMedian: sql`excluded.co2_g_km_median`,
          co2GKmMax: sql`excluded.co2_g_km_max`,
          scrapedAt: new Date()
        }
      })
  }
}

async function download(args: Args): Promise<RdwSpecsInsert[]> {
  const maxYear = new Date().getFullYear() + 1
  const makes = args.make
    ? [args.make]
    : (await cached(`makes-${args.minVehicles}`, args.refresh, () => soql(makesQuery(args.minVehicles)))).map(r =>
        String(r.merk)
      )
  log(`${makes.length} make(s) to aggregate`)

  const rows: RdwSpecsInsert[] = []
  const failed: string[] = []
  const run = async (list: string[], label: string): Promise<void> => {
    let i = 0
    for (const make of list) {
      i++
      try {
        const records = await cached(`make-${make}`, args.refresh, () => fetchMake(make, maxYear))
        const parsed = records
          .map(rec => parseSpecsRecord(make, rec, RDW_MIN_N, maxYear))
          .filter((r): r is RdwSpecsInsert => r !== null)
        rows.push(...parsed)
        log(`[${label} ${i}/${list.length}] ${make}: ${records.length} group(s) → ${parsed.length} row(s)`)
      } catch (err) {
        // A make that RDW can't answer must not stop the run; it is retried once at the end and listed if still failing.
        failed.push(make)
        log(`[${label} ${i}/${list.length}] ${make}: FAILED ${String(err).slice(0, 160)}`)
      }
    }
  }

  await run(makes, 'make')
  if (failed.length > 0) {
    const retry = failed.splice(0)
    log(`retrying ${retry.length} failed make(s) …`)
    await run(retry, 'retry')
  }
  if (failed.length > 0) {
    log(
      `STILL FAILED (${failed.length}) — re-run pnpm ingest:rdw to retry only these (the rest is cached): ${failed.join(', ')}`
    )
  }
  return dedupeByKey(rows)
}

const CSV_COLUMNS = [
  'kind',
  'make',
  'model',
  'make_key',
  'model_key',
  'model_year',
  'n',
  'power_kw_min',
  'power_kw_median',
  'power_kw_max',
  'displacement_cc_min',
  'displacement_cc_median',
  'displacement_cc_max',
  'mass_kg_min',
  'mass_kg_median',
  'mass_kg_max',
  'co2_g_km_min',
  'co2_g_km_median',
  'co2_g_km_max',
  'scraped_at'
] as const

const numToCell = (v: number | null): string => (v == null ? '' : String(v))
const cellToNum = (v: string | undefined): number | null => (v ? Number(v) : null)

function rowToCsvRecord(r: RdwSpecsRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    kind: r.kind,
    make: r.make,
    model: r.model,
    make_key: r.makeKey,
    model_key: r.modelKey,
    model_year: String(r.modelYear),
    n: String(r.n),
    power_kw_min: numToCell(r.powerKwMin),
    power_kw_median: numToCell(r.powerKwMedian),
    power_kw_max: numToCell(r.powerKwMax),
    displacement_cc_min: numToCell(r.displacementCcMin),
    displacement_cc_median: numToCell(r.displacementCcMedian),
    displacement_cc_max: numToCell(r.displacementCcMax),
    mass_kg_min: numToCell(r.massKgMin),
    mass_kg_median: numToCell(r.massKgMedian),
    mass_kg_max: numToCell(r.massKgMax),
    co2_g_km_min: numToCell(r.co2GKmMin),
    co2_g_km_median: numToCell(r.co2GKmMedian),
    co2_g_km_max: numToCell(r.co2GKmMax),
    scraped_at: r.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): RdwSpecsInsert {
  return {
    kind: rec.kind!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    modelYear: Number(rec.model_year),
    n: Number(rec.n),
    powerKwMin: cellToNum(rec.power_kw_min),
    powerKwMedian: cellToNum(rec.power_kw_median),
    powerKwMax: cellToNum(rec.power_kw_max),
    displacementCcMin: cellToNum(rec.displacement_cc_min),
    displacementCcMedian: cellToNum(rec.displacement_cc_median),
    displacementCcMax: cellToNum(rec.displacement_cc_max),
    massKgMin: cellToNum(rec.mass_kg_min),
    massKgMedian: cellToNum(rec.mass_kg_median),
    massKgMax: cellToNum(rec.mass_kg_max),
    co2GKmMin: cellToNum(rec.co2_g_km_min),
    co2GKmMedian: cellToNum(rec.co2_g_km_median),
    co2GKmMax: cellToNum(rec.co2_g_km_max),
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(rdwSpecs)
    .orderBy(rdwSpecs.kind, rdwSpecs.makeKey, rdwSpecs.modelKey, rdwSpecs.modelYear)
  const csv = stringifyCsv(rows.map(rowToCsvRecord), { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  await upsertAll(db, records.map(csvRecordToRow))
  log(`imported ${records.length} row(s) from ${path}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) {
      await exportToCsv(db, args.exportCsv)
    } else if (args.fromCsv) {
      await importFromCsv(db, args.fromCsv)
    } else {
      const rows = await download(args)
      if (args.dryRun) {
        log(`dry-run: would upsert ${rows.length} row(s)`)
      } else {
        await upsertAll(db, rows)
        log(`upserted ${rows.length} row(s)`)
      }
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
