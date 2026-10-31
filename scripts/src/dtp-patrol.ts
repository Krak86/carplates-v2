/**
 * Loads the Patrol Police road-crash statistics (`patrolpolice.gov.ua/statystyka/`, pre-aggregated XLSX, crashes with injured /
 * killed) into the `registry.dtp_*_year` tables (`dtp-xlsx-parse.ts`). The page links one file per year (`12.2025.xlsx`) and a
 * year-to-date file per month of the current year (`09.2026.xlsx`). Only the newest file of each year is read, and a year is
 * replaced in one transaction unless the database already holds a later period of it. Files before 2022 (`.xls`, or counting
 * all crashes) are skipped. Hazardous sections come from `pnpm ingest:dtp`. See docs/road-safety-plan.md.
 *
 *   pnpm ingest:dtp:patrol                   # newest file of every year 2022+
 *   pnpm ingest:dtp:patrol --dry-run         # download + print counts, write nothing
 *   pnpm ingest:dtp:patrol --file ./12.2025.xlsx   # one local workbook
 */
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { createDb, dtpCauseYear, dtpRegionYear, dtpRoadYear, dtpTimeYear, dtpTypeYear } from '@carplates/db'
import { eq, max } from 'drizzle-orm'
import readExcelFile from 'read-excel-file/node'

import { parsePatrolWorkbook } from './dtp-xlsx-parse.js'
import type { PatrolParse, PatrolSheet } from './dtp-xlsx-parse.js'

const PAGE = 'https://patrolpolice.gov.ua/statystyka/'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const FIRST_YEAR = 2022
/** A full year has 24 oblasts / Kyiv; fewer rows means the layout changed under us. */
const MIN_REGIONS = 20

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
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} (page: ${PAGE})`)
  return res
}

type Source = { name: string; year: number; month: number; load: () => Promise<Buffer> }

/** `…/2026/10/09.2026.xlsx` → the newest (highest month) file of each year from FIRST_YEAR on, oldest year first. */
async function listSources(): Promise<Source[]> {
  const html = await (await fetchOk(PAGE)).text()
  const newest = new Map<number, Source>()
  for (const m of html.matchAll(/href="([^"]*\/(\d{2})\.(\d{4})\.xlsx)"/g)) {
    const [url, month, year] = [m[1] as string, Number(m[2]), Number(m[3])]
    if (year < FIRST_YEAR || month < 1 || month > 12) continue
    const known = newest.get(year)
    if (known && known.month >= month) continue
    newest.set(year, {
      name: basename(new URL(url, PAGE).pathname),
      year,
      month,
      load: async () => Buffer.from(await (await fetchOk(new URL(url, PAGE).href)).arrayBuffer())
    })
  }
  if (newest.size === 0) throw new Error(`no NN.YYYY.xlsx link on ${PAGE}`)
  return [...newest.values()].sort((a, b) => a.year - b.year)
}

async function save(db: ReturnType<typeof createDb>['db'], p: PatrolParse): Promise<boolean> {
  const stored = (
    await db
      .select({ period: max(dtpRegionYear.period) })
      .from(dtpRegionYear)
      .where(eq(dtpRegionYear.year, p.year))
  )[0]?.period
  if (stored != null && stored > p.period) {
    log(`${p.year}: database already has period ${stored} (> ${p.period}), skipped`)
    return false
  }
  await db.transaction(async tx => {
    for (const table of [dtpRegionYear, dtpCauseYear, dtpTypeYear, dtpTimeYear, dtpRoadYear]) {
      await tx.delete(table).where(eq(table.year, p.year))
    }
    await tx.insert(dtpRegionYear).values(p.regions)
    if (p.causes.length) await tx.insert(dtpCauseYear).values(p.causes)
    if (p.types.length) await tx.insert(dtpTypeYear).values(p.types)
    if (p.time.length) await tx.insert(dtpTimeYear).values(p.time)
    if (p.roads.length) await tx.insert(dtpRoadYear).values(p.roads)
  })
  return true
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const file = args.file
  const sources: { name: string; load: () => Promise<Buffer> }[] = file
    ? [{ name: basename(file), load: () => readFile(file) }]
    : await listSources()

  const parsed: PatrolParse[] = []
  for (const source of sources) {
    const sheets = (await readExcelFile(await source.load())) as PatrolSheet[]
    const p = parsePatrolWorkbook(sheets)
    if (p.regions.length < MIN_REGIONS) throw new Error(`${source.name}: only ${p.regions.length} regions`)
    log(
      `${source.name}: ${p.year} period ${p.period}: ${p.regions.length} region(s), ${p.causes.length} cause(s), ${p.types.length} type(s), ${p.time.length} time bucket(s), ${p.roads.length} road(s)`
    )
    parsed.push(p)
  }
  if (args.dryRun) return

  const { db, close } = createDb()
  try {
    for (const p of parsed) if (await save(db, p)) log(`${p.year}: replaced (period ${p.period})`)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
