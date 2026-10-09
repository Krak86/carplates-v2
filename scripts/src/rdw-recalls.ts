/**
 * Loads RDW recall campaigns (CC0, opendata.rdw.nl) into `registry.rdw_recalls` + `registry.rdw_recall_models`: the campaign
 * list `j9yg-7rg9`, the make/type pairs each covers `mu2x-mu5e` and the hazard texts `9ihi-jgpf` — ~5k + ~11k + ~5k small rows,
 * so plain paged reads, no server-side aggregation. Model-level only: the per-plate status dataset `t49b-isb7` is Dutch plates.
 * Campaigns are upserted by reference code (RDW edits them); their model links are replaced wholesale.
 *
 *   pnpm ingest:rdw-recalls                              # download + upsert
 *   pnpm ingest:rdw-recalls -- --dry-run                 # download + count, write nothing
 *   pnpm ingest:rdw-recalls -- --export-csv ./x.csv.gz   # dump the current tables (one file, a `part` column)
 *   pnpm ingest:rdw-recalls -- --from-csv ./x.csv.gz     # load a dump, no download
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, rdwRecallModels, rdwRecalls } from '@carplates/db'
import type { Db, RdwRecallInsert, RdwRecallModelInsert } from '@carplates/db'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { sql } from 'drizzle-orm'

import { dedupeModels, groupHazards, parseCampaign, parseCampaignModel } from './rdw-recalls-parse.js'

const BASE = 'https://opendata.rdw.nl/resource'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const PAGE = 5000
const BATCH = 500
const TIMEOUT_MS = 120_000
const RETRIES = 3

const DATASETS = { campaigns: 'j9yg-7rg9', models: 'mu2x-mu5e', hazards: '9ihi-jgpf' } as const

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

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

async function getPage(id: string, offset: number): Promise<Record<string, unknown>[]> {
  const url = `${BASE}/${id}.json?$limit=${PAGE}&$offset=${offset}&$order=:id`
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.ok) return (await res.json()) as Record<string, unknown>[]
      lastError = new Error(`RDW ${res.status}: ${(await res.text()).slice(0, 200)}`)
    } catch (err) {
      lastError = err
    }
    await sleep(attempt * 3000)
  }
  throw lastError
}

async function getAll(id: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += PAGE) {
    const page = await getPage(id, offset)
    out.push(...page)
    if (page.length < PAGE) return out
  }
}

type Snapshot = { recalls: RdwRecallInsert[]; models: RdwRecallModelInsert[] }

async function download(): Promise<Snapshot> {
  const [campaigns, models, hazards] = await Promise.all([
    getAll(DATASETS.campaigns),
    getAll(DATASETS.models),
    getAll(DATASETS.hazards)
  ])
  log(`downloaded ${campaigns.length} campaign(s), ${models.length} make/type row(s), ${hazards.length} hazard row(s)`)
  const byCode = groupHazards(hazards)
  const recalls = campaigns
    .map(c => parseCampaign(c, byCode.get(String(c.referentiecode_rdw ?? '').trim()) ?? []))
    .filter((r): r is RdwRecallInsert => r !== null)
  const known = new Set(recalls.map(r => r.referenceCode))
  const links = dedupeModels(
    models.map(parseCampaignModel).filter((r): r is RdwRecallModelInsert => r !== null && known.has(r.referenceCode))
  )
  return { recalls, models: links }
}

async function save(db: Db, { recalls, models }: Snapshot): Promise<void> {
  await db.transaction(async tx => {
    for (let i = 0; i < recalls.length; i += BATCH) {
      await tx
        .insert(rdwRecalls)
        .values(recalls.slice(i, i + BATCH))
        .onConflictDoUpdate({
          target: rdwRecalls.referenceCode,
          set: {
            publishedAt: sql`excluded.published_at`,
            announcedAt: sql`excluded.announced_at`,
            producer: sql`excluded.producer`,
            defect: sql`excluded.defect`,
            category: sql`excluded.category`,
            consequences: sql`excluded.consequences`,
            remedy: sql`excluded.remedy`,
            moreInfoUrl: sql`excluded.more_info_url`,
            riskCode: sql`excluded.risk_code`,
            hazards: sql`excluded.hazards`,
            vehiclesTotal: sql`excluded.vehicles_total`,
            vehiclesNational: sql`excluded.vehicles_national`,
            scrapedAt: new Date()
          }
        })
    }
    // The links are a pure function of the campaign list: replace them so a corrected type spelling leaves no orphan.
    await tx.execute(sql`TRUNCATE registry.rdw_recall_models`)
    for (let i = 0; i < models.length; i += BATCH) {
      await tx
        .insert(rdwRecallModels)
        .values(models.slice(i, i + BATCH))
        .onConflictDoNothing()
    }
  })
  log(`upserted ${recalls.length} campaign(s) and ${models.length} make/type link(s)`)
}

// One CSV, two parts. Campaign columns and link columns are both flat, so a `part` column tells them apart.
const CSV_COLUMNS = [
  'part',
  'reference_code',
  'published_at',
  'announced_at',
  'producer',
  'defect',
  'category',
  'consequences',
  'remedy',
  'more_info_url',
  'risk_code',
  'hazards',
  'vehicles_total',
  'vehicles_national',
  'make',
  'model',
  'make_key',
  'model_key'
] as const

const cell = (v: string | number | null | undefined): string => (v == null ? '' : String(v))
const orNull = (v: string | undefined): string | null => (v ? v : null)
const numOrNull = (v: string | undefined): number | null => (v ? Number(v) : null)

async function exportToCsv(db: Db, path: string): Promise<void> {
  const recalls = await db.select().from(rdwRecalls).orderBy(rdwRecalls.referenceCode)
  const models = await db
    .select()
    .from(rdwRecallModels)
    .orderBy(rdwRecallModels.referenceCode, rdwRecallModels.makeKey, rdwRecallModels.modelKey)
  const records = [
    ...recalls.map(r => ({
      part: 'recall',
      reference_code: r.referenceCode,
      published_at: cell(r.publishedAt),
      announced_at: cell(r.announcedAt),
      producer: cell(r.producer),
      defect: cell(r.defect),
      category: cell(r.category),
      consequences: cell(r.consequences),
      remedy: cell(r.remedy),
      more_info_url: cell(r.moreInfoUrl),
      risk_code: cell(r.riskCode),
      hazards: r.hazards?.length ? JSON.stringify(r.hazards) : '',
      vehicles_total: cell(r.vehiclesTotal),
      vehicles_national: cell(r.vehiclesNational)
    })),
    ...models.map(m => ({
      part: 'model',
      reference_code: m.referenceCode,
      make: m.make,
      model: m.model,
      make_key: m.makeKey,
      model_key: m.modelKey
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
  const records = parseCsv(content, { columns: true, trim: true }) as Record<string, string>[]
  const recalls: RdwRecallInsert[] = records
    .filter(r => r.part === 'recall')
    .map(r => ({
      referenceCode: r.reference_code!,
      publishedAt: orNull(r.published_at),
      announcedAt: orNull(r.announced_at),
      producer: orNull(r.producer),
      defect: orNull(r.defect),
      category: orNull(r.category),
      consequences: orNull(r.consequences),
      remedy: orNull(r.remedy),
      moreInfoUrl: orNull(r.more_info_url),
      riskCode: orNull(r.risk_code),
      hazards: r.hazards ? (JSON.parse(r.hazards) as string[]) : [],
      vehiclesTotal: numOrNull(r.vehicles_total),
      vehiclesNational: numOrNull(r.vehicles_national)
    }))
  const models: RdwRecallModelInsert[] = records
    .filter(r => r.part === 'model')
    .map(r => ({
      referenceCode: r.reference_code!,
      make: r.make!,
      model: r.model!,
      makeKey: r.make_key!,
      modelKey: r.model_key!
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
      const snapshot = await download()
      if (args.dryRun) {
        log(`dry-run: would upsert ${snapshot.recalls.length} campaign(s), ${snapshot.models.length} link(s)`)
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
