/**
 * Loads fuel consumption + tailpipe CO2 reference data into `registry.fuel_economy`.
 *
 *   pnpm ingest:fuel                       # EPA (vehicles.csv.zip) + EEA (DiscoData SQL API), both cached on disk
 *   pnpm ingest:fuel -- --only epa|eea     # just one source
 *   pnpm ingest:fuel -- --dry-run          # parse + count, write nothing
 *   pnpm ingest:fuel -- --refresh          # re-download/re-query even if cached
 *   pnpm ingest:fuel -- --export-csv ./x.csv[.gz]   # dump the current table
 *   pnpm ingest:fuel -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no download
 *
 * fueleconomy.gov (US DOE/EPA) publishes one bulk file, public domain; EPA test cycle, so values read
 * lower than WLTP — the `cycle` column carries that. The zip is cached in scripts/.data/fuel/ (gitignored).
 * EEA (EU, 2015+): grouped server-side per year, never raw rows — see fuel-economy-eea.ts. WLTP from 2018/2019,
 * NEDC before that.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, fuelEconomy } from '@carplates/db'
import type { Db, FuelEconomyInsert, FuelEconomyRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'
// eslint-disable-next-line import-x/default -- CJS `export =` typings; esModuleInterop makes the default real
import unzipper from 'unzipper'

import { collapseEeaGroups, fetchEeaSlice, resolveEeaSlices } from './fuel-economy-eea.js'
import { parseEpaRow } from './fuel-economy-parse.js'

const EPA_URL = 'https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'fuel')
const BATCH = 1000

type Source = 'epa' | 'eea'
type Args = { dryRun: boolean; refresh: boolean; only?: Source; exportCsv?: string; fromCsv?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--only') a.only = argv[++i] === 'eea' ? 'eea' : 'epa'
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function upsertAll(db: Db, rows: FuelEconomyInsert[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(fuelEconomy)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: fuelEconomy.id,
        set: {
          cycle: sql`excluded.cycle`,
          powertrain: sql`excluded.powertrain`,
          l100km: sql`excluded.l_100km`,
          co2GKm: sql`excluded.co2_g_km`,
          evKwh100km: sql`excluded.ev_kwh_100km`,
          scrapedAt: new Date()
        }
      })
  }
}

async function loadEpa(args: Args): Promise<FuelEconomyInsert[]> {
  const zipPath = join(DATA_DIR, 'vehicles.csv.zip')
  if (args.refresh || !existsSync(zipPath)) {
    log(`downloading ${EPA_URL} …`)
    const res = await fetch(EPA_URL, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(zipPath, Buffer.from(await res.arrayBuffer()))
  }

  const dir = await unzipper.Open.file(zipPath)
  const entry = dir.files.find(f => /\.csv$/i.test(f.path))
  if (!entry) throw new Error('no CSV in vehicles.csv.zip')
  const csv = (await entry.buffer()).toString('utf8')

  const records = parseCsv(csv, { columns: true, skip_empty_lines: true, relax_quotes: true }) as Record<
    string,
    string
  >[]
  const rows = records.map(parseEpaRow).filter((r): r is FuelEconomyInsert => r !== null)
  log(`parsed ${rows.length} usable row(s) of ${records.length}`)
  return rows
}

async function loadEea(args: Args): Promise<FuelEconomyInsert[]> {
  const slices = await resolveEeaSlices()
  const rows: FuelEconomyInsert[] = []
  for (const slice of slices) {
    const groups = await fetchEeaSlice(slice, args.refresh)
    const collapsed = collapseEeaGroups(slice.year, groups)
    log(`eea ${slice.year}: ${groups.length} group(s) → ${collapsed.length} row(s)`)
    rows.push(...collapsed)
  }
  return rows
}

const CSV_COLUMNS = [
  'id',
  'source',
  'cycle',
  'make',
  'model',
  'make_key',
  'model_key',
  'model_year',
  'fuel_type',
  'fuel_category',
  'powertrain',
  'engine_cc',
  'cylinders',
  'l_100km',
  'co2_g_km',
  'ev_kwh_100km',
  'scraped_at'
] as const

const numToCell = (v: number | null): string => (v == null ? '' : String(v))
const cellToNum = (v: string | undefined): number | null => (v ? Number(v) : null)

function rowToCsvRecord(r: FuelEconomyRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    id: r.id,
    source: r.source,
    cycle: r.cycle,
    make: r.make,
    model: r.model,
    make_key: r.makeKey,
    model_key: r.modelKey,
    model_year: String(r.modelYear),
    fuel_type: r.fuelType,
    fuel_category: r.fuelCategory,
    powertrain: r.powertrain,
    engine_cc: numToCell(r.engineCc),
    cylinders: numToCell(r.cylinders),
    l_100km: numToCell(r.l100km),
    co2_g_km: numToCell(r.co2GKm),
    ev_kwh_100km: numToCell(r.evKwh100km),
    scraped_at: r.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): FuelEconomyInsert {
  return {
    id: rec.id!,
    source: rec.source!,
    cycle: rec.cycle!,
    make: rec.make!,
    model: rec.model!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    modelYear: Number(rec.model_year),
    fuelType: rec.fuel_type!,
    fuelCategory: rec.fuel_category!,
    powertrain: rec.powertrain || 'ice',
    engineCc: cellToNum(rec.engine_cc),
    cylinders: cellToNum(rec.cylinders),
    l100km: cellToNum(rec.l_100km),
    co2GKm: cellToNum(rec.co2_g_km),
    evKwh100km: cellToNum(rec.ev_kwh_100km),
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(fuelEconomy).orderBy(fuelEconomy.id)
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
      const rows = [
        ...(args.only === 'eea' ? [] : await loadEpa(args)),
        ...(args.only === 'epa' ? [] : await loadEea(args))
      ]
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
