/**
 * Loads the Transport Canada recalls that have NO US twin into `registry.ca_recalls` + `registry.ca_recall_models`. Sources:
 * TC's Vehicle Recalls Database CSV (OGL - Canada, ~200 MB) for the Canadian side, NHTSA's `FLAT_RCL_POST_2010.zip` (public
 * domain, ~15 MB) only to decide which Canadian campaigns are a repeat of a US one. Safety notifications since 2010 only. Both
 * tables are replaced as a whole. Downloads are cached in `scripts/.data/ca-recalls/` (`--refresh` fetches again).
 *
 *   pnpm ingest:ca-recalls                              # download (cached) + compare + replace
 *   pnpm ingest:ca-recalls -- --dry-run                 # compare + print counts, write nothing
 *   pnpm ingest:ca-recalls -- --export-csv ./x.csv.gz   # dump the current tables (one file, a `part` column)
 *   pnpm ingest:ca-recalls -- --from-csv ./x.csv.gz     # load a dump, no download
 */
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'

import { caRecallModels, caRecalls, createDb } from '@carplates/db'
import type { CaRecallInsert, CaRecallModelInsert, Db } from '@carplates/db'
import { parse as parseCsvStream } from 'csv-parse'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import {
  addTcRow,
  addUsLine,
  groupUsByMake,
  hasUsTwin,
  toSnapshot,
  type CaCampaign,
  type CaSnapshot,
  type UsCampaign
} from './ca-recalls-parse.js'
import { openZipEntry } from './mot-zip.js'

const TC_URL = 'https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv'
const NHTSA_URL = 'https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip'
const CACHE_DIR = new URL('../.data/ca-recalls/', import.meta.url)
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 500

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

async function cached(url: string, name: string, refresh: boolean): Promise<string> {
  const file = fileURLToPath(new URL(name, CACHE_DIR))
  if (!refresh) {
    try {
      if ((await stat(file)).size > 0) return file
    } catch {
      // not downloaded yet
    }
  }
  await mkdir(dirname(file), { recursive: true })
  log(`downloading ${url}`)
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file))
  return file
}

async function readTc(path: string): Promise<Map<string, CaCampaign>> {
  const acc = new Map<string, CaCampaign>()
  const parser = createReadStream(path).pipe(
    parseCsvStream({ columns: true, relax_quotes: true, relax_column_count: true, bom: true })
  )
  for await (const row of parser) addTcRow(acc, row as Record<string, string>)
  return acc
}

async function readUs(zipPath: string): Promise<Map<string, UsCampaign>> {
  const acc = new Map<string, UsCampaign>()
  const lines = createInterface({ input: openZipEntry(zipPath, '.txt'), crlfDelay: Infinity })
  for await (const line of lines) addUsLine(acc, line)
  return acc
}

async function download(refresh: boolean): Promise<{ snapshot: CaSnapshot; tcTotal: number; twins: number }> {
  const [tcPath, usPath] = await Promise.all([
    cached(TC_URL, 'vrdb_full_monthly.csv', refresh),
    cached(NHTSA_URL, 'FLAT_RCL_POST_2010.zip', refresh)
  ])
  const [tc, us] = await Promise.all([readTc(tcPath), readUs(usPath)])
  const usByMake = groupUsByMake(us.values())
  const alone = [...tc.values()].filter(c => !hasUsTwin(c, usByMake))
  log(`Transport Canada safety campaigns since 2010: ${tc.size}; NHTSA campaigns: ${us.size}`)
  return { snapshot: toSnapshot(alone), tcTotal: tc.size, twins: tc.size - alone.length }
}

async function save(db: Db, { recalls, models }: CaSnapshot): Promise<void> {
  await db.transaction(async tx => {
    // Which campaigns have a twin can change with every NHTSA update, so both tables are replaced, not upserted.
    await tx.execute(sql`TRUNCATE registry.ca_recall_models, registry.ca_recalls`)
    for (let i = 0; i < recalls.length; i += BATCH) {
      await tx.insert(caRecalls).values(recalls.slice(i, i + BATCH))
    }
    for (let i = 0; i < models.length; i += BATCH) {
      await tx
        .insert(caRecallModels)
        .values(models.slice(i, i + BATCH))
        .onConflictDoNothing()
    }
  })
  log(`stored ${recalls.length} campaign(s) and ${models.length} make/model/year link(s)`)
}

// One CSV, two parts (`recall` / `model`), like the RDW recalls seed.
const CSV_COLUMNS = [
  'part',
  'recall_number',
  'recalled_at',
  'notification',
  'category',
  'system',
  'mfr_recall_no',
  'comment',
  'units',
  'make',
  'model',
  'make_key',
  'model_key',
  'model_year'
] as const

const cell = (v: string | number | null | undefined): string => (v == null ? '' : String(v))
const orNull = (v: string | undefined): string | null => (v ? v : null)

async function exportToCsv(db: Db, path: string): Promise<void> {
  const recalls = await db.select().from(caRecalls).orderBy(caRecalls.recallNumber)
  const models = await db
    .select()
    .from(caRecallModels)
    .orderBy(caRecallModels.recallNumber, caRecallModels.makeKey, caRecallModels.modelKey, caRecallModels.modelYear)
  const records = [
    ...recalls.map(r => ({
      part: 'recall',
      recall_number: r.recallNumber,
      recalled_at: cell(r.recalledAt),
      notification: cell(r.notification),
      category: cell(r.category),
      system: cell(r.system),
      mfr_recall_no: cell(r.mfrRecallNo),
      comment: cell(r.comment),
      units: cell(r.units)
    })),
    ...models.map(m => ({
      part: 'model',
      recall_number: m.recallNumber,
      make: m.make,
      model: m.model,
      make_key: m.makeKey,
      model_key: m.modelKey,
      model_year: m.modelYear
    }))
  ]
  const csv = stringifyCsv(records, { header: true, columns: [...CSV_COLUMNS] })
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(
    `exported ${recalls.length} campaign(s) + ${models.length} link(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`
  )
}

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const content = isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const records = parseCsv(content, { columns: true }) as Record<string, string>[]
  const recalls: CaRecallInsert[] = records
    .filter(r => r.part === 'recall')
    .map(r => ({
      recallNumber: r.recall_number!,
      recalledAt: orNull(r.recalled_at),
      notification: orNull(r.notification),
      category: orNull(r.category),
      system: orNull(r.system),
      mfrRecallNo: orNull(r.mfr_recall_no),
      comment: orNull(r.comment),
      units: r.units ? Number(r.units) : null
    }))
  const models: CaRecallModelInsert[] = records
    .filter(r => r.part === 'model')
    .map(r => ({
      recallNumber: r.recall_number!,
      make: r.make!,
      model: r.model!,
      makeKey: r.make_key!,
      modelKey: r.model_key!,
      modelYear: Number(r.model_year || 0)
    }))
  await save(db, { recalls, models })
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
      const { snapshot, tcTotal, twins } = await download(args.refresh)
      log(
        `with a US twin: ${twins} (${((100 * twins) / tcTotal).toFixed(1)} %); Canada-only: ${snapshot.recalls.length}`
      )
      if (args.dryRun) {
        log(`dry-run: would store ${snapshot.recalls.length} campaign(s), ${snapshot.models.length} link(s)`)
      } else {
        await save(db, snapshot)
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
