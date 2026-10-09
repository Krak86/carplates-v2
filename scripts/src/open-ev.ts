/**
 * Loads Open EV Data (MIT, github.com/OpenChargingCloud/open-ev-data) into `registry.open_ev`: one JSON file, ~120 EV / PHEV
 * variants with usable battery, consumption and AC / DC charging. Upserted by the file's variant id.
 * NB: the upstream data file has not been edited since 2020-07 — it covers models of that era only.
 *
 *   pnpm ingest:open-ev                              # download + upsert
 *   pnpm ingest:open-ev -- --dry-run                 # download + count, write nothing
 *   pnpm ingest:open-ev -- --export-csv ./x.csv.gz   # dump the current table
 *   pnpm ingest:open-ev -- --from-csv ./x.csv.gz     # load a dump, no download
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, openEv } from '@carplates/db'
import type { Db, OpenEvInsert } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { evFileSchema, parseEvEntry } from './open-ev-parse.js'

const SOURCE_URL = 'https://raw.githubusercontent.com/OpenChargingCloud/open-ev-data/master/data/ev-data.json'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'

type Args = { dryRun: boolean; exportCsv?: string; fromCsv?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function download(): Promise<OpenEvInsert[]> {
  const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Open EV Data ${res.status}`)
  const file = evFileSchema.parse(await res.json())
  const rows = file.data.map(parseEvEntry).filter((r): r is OpenEvInsert => r !== null)
  log(`downloaded ${file.data.length} entr(ies), ${rows.length} usable`)
  return rows
}

async function save(db: Db, rows: OpenEvInsert[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(openEv)
    .values(rows)
    .onConflictDoUpdate({
      target: openEv.id,
      set: {
        make: sql`excluded.make`,
        model: sql`excluded.model`,
        variant: sql`excluded.variant`,
        makeKey: sql`excluded.make_key`,
        modelKey: sql`excluded.model_key`,
        powertrain: sql`excluded.powertrain`,
        releaseYear: sql`excluded.release_year`,
        batteryKwh: sql`excluded.battery_kwh`,
        consumptionKwh100: sql`excluded.consumption_kwh100`,
        acMaxKw: sql`excluded.ac_max_kw`,
        acPhases: sql`excluded.ac_phases`,
        acPorts: sql`excluded.ac_ports`,
        dcMaxKw: sql`excluded.dc_max_kw`,
        dcPorts: sql`excluded.dc_ports`,
        scrapedAt: new Date()
      }
    })
  log(`upserted ${rows.length} variant(s)`)
}

const CSV_COLUMNS = [
  'id',
  'make',
  'model',
  'variant',
  'make_key',
  'model_key',
  'powertrain',
  'release_year',
  'battery_kwh',
  'consumption_kwh100',
  'ac_max_kw',
  'ac_phases',
  'ac_ports',
  'dc_max_kw',
  'dc_ports'
] as const

const cell = (v: string | number | null | undefined): string => (v == null ? '' : String(v))
const numOrNull = (v: string | undefined): number | null => (v ? Number(v) : null)
const list = (v: string | undefined): string[] => (v ? v.split('|') : [])

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(openEv).orderBy(openEv.makeKey, openEv.modelKey, openEv.id)
  const records = rows.map(r => ({
    id: r.id,
    make: r.make,
    model: r.model,
    variant: r.variant,
    make_key: r.makeKey,
    model_key: r.modelKey,
    powertrain: r.powertrain,
    release_year: cell(r.releaseYear),
    battery_kwh: cell(r.batteryKwh),
    consumption_kwh100: cell(r.consumptionKwh100),
    ac_max_kw: cell(r.acMaxKw),
    ac_phases: cell(r.acPhases),
    ac_ports: (r.acPorts ?? []).join('|'),
    dc_max_kw: cell(r.dcMaxKw),
    dc_ports: (r.dcPorts ?? []).join('|')
  }))
  const csv = stringifyCsv(records, { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} variant(s) to ${path} (${(output.length / 1024).toFixed(1)} KB)`)
}

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  await save(
    db,
    records.map(r => ({
      id: r.id!,
      make: r.make!,
      model: r.model!,
      variant: r.variant ?? '',
      makeKey: r.make_key!,
      modelKey: r.model_key!,
      powertrain: r.powertrain!,
      releaseYear: numOrNull(r.release_year),
      batteryKwh: numOrNull(r.battery_kwh),
      consumptionKwh100: numOrNull(r.consumption_kwh100),
      acMaxKw: numOrNull(r.ac_max_kw),
      acPhases: numOrNull(r.ac_phases),
      acPorts: list(r.ac_ports),
      dcMaxKw: numOrNull(r.dc_max_kw),
      dcPorts: list(r.dc_ports)
    }))
  )
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
      const rows = await download()
      if (args.dryRun) log(`dry-run: would upsert ${rows.length} variant(s)`)
      else await save(db, rows)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
