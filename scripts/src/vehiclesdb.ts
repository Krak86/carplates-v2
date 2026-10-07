/**
 * Loads the VehiclesDB make/model catalog (markets + cross-market popularity decile) into `registry.vdb_models`.
 *
 *   pnpm ingest:vehiclesdb                      # download dist/vehicles.csv (cached on disk) and upsert
 *   pnpm ingest:vehiclesdb -- --dry-run         # parse + count, write nothing
 *   pnpm ingest:vehiclesdb -- --refresh         # re-download even if cached
 *   pnpm ingest:vehiclesdb -- --export-csv ./x.csv[.gz]   # dump the current table
 *   pnpm ingest:vehiclesdb -- --from-csv ./x.csv[.gz]     # load a CSV you already have, no download
 *
 * VehiclesDB (https://vehiclesdb.com) is CC-BY 4.0: "Vehicle data by VehiclesDB" must be credited on the About
 * sources page. The download is untrusted and cached in scripts/.data/vehiclesdb/ (gitignored). The committed
 * seed CSV is a dump of the table, so `--from-csv` needs no network.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, vdbModels } from '@carplates/db'
import type { Db, VdbModelInsert, VdbModelRow } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { parseDecile, parseVehiclesDbRow, splitList } from './vehiclesdb-parse.js'

const CSV_URL = 'https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/dist/vehicles.csv'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'vehiclesdb')
const BATCH = 1000

type Args = { dryRun: boolean; refresh: boolean; exportCsv?: string; fromCsv?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function upsertAll(db: Db, rows: VdbModelInsert[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(vdbModels)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: vdbModels.id,
        set: {
          makeName: sql`excluded.make_name`,
          modelName: sql`excluded.model_name`,
          makeKey: sql`excluded.make_key`,
          modelKey: sql`excluded.model_key`,
          bodyTypes: sql`excluded.body_types`,
          countries: sql`excluded.countries`,
          regions: sql`excluded.regions`,
          globalDecile: sql`excluded.global_decile`,
          aliases: sql`excluded.aliases`,
          formerIds: sql`excluded.former_ids`,
          scrapedAt: new Date()
        }
      })
  }
}

async function loadFromWeb(args: Args): Promise<VdbModelInsert[]> {
  const path = join(DATA_DIR, 'vehicles.csv')
  if (args.refresh || !existsSync(path)) {
    log(`downloading ${CSV_URL} …`)
    const res = await fetch(CSV_URL, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
  }
  const records = parseCsv(await readFile(path, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true
  }) as Record<string, string>[]
  const rows = records.map(parseVehiclesDbRow).filter((r): r is VdbModelInsert => r !== null)
  log(`parsed ${rows.length} usable row(s) of ${records.length}`)
  return rows
}

const CSV_COLUMNS = [
  'id',
  'kind',
  'make_slug',
  'make_name',
  'model_slug',
  'model_name',
  'make_key',
  'model_key',
  'body_types',
  'countries',
  'regions',
  'global_decile',
  'aliases',
  'former_ids',
  'scraped_at'
] as const

const listToCell = (v: string[]): string => v.join('|')

function rowToCsvRecord(r: VdbModelRow): Record<(typeof CSV_COLUMNS)[number], string> {
  return {
    id: r.id,
    kind: r.kind,
    make_slug: r.makeSlug,
    make_name: r.makeName,
    model_slug: r.modelSlug,
    model_name: r.modelName,
    make_key: r.makeKey,
    model_key: r.modelKey,
    body_types: listToCell(r.bodyTypes),
    countries: listToCell(r.countries),
    regions: listToCell(r.regions),
    global_decile: r.globalDecile == null ? '' : String(r.globalDecile),
    aliases: listToCell(r.aliases),
    former_ids: listToCell(r.formerIds),
    scraped_at: r.scrapedAt.toISOString()
  }
}

function csvRecordToRow(rec: Record<string, string>): VdbModelInsert {
  return {
    id: rec.id!,
    kind: rec.kind!,
    makeSlug: rec.make_slug!,
    makeName: rec.make_name!,
    modelSlug: rec.model_slug!,
    modelName: rec.model_name!,
    makeKey: rec.make_key!,
    modelKey: rec.model_key!,
    bodyTypes: splitList(rec.body_types ?? ''),
    countries: splitList(rec.countries ?? ''),
    regions: splitList(rec.regions ?? ''),
    globalDecile: parseDecile(rec.global_decile ?? ''),
    aliases: splitList(rec.aliases ?? ''),
    formerIds: splitList(rec.former_ids ?? ''),
    scrapedAt: new Date(rec.scraped_at!)
  }
}

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db.select().from(vdbModels).orderBy(vdbModels.id)
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
      const rows = await loadFromWeb(args)
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
