/**
 * Loads the road hazardous sections and crash concentration places (Infrastructure Restoration Agency, open data, CC BY,
 * data.gov.ua dataset `9b6a7292-…`) into `registry.dtp_hazard_section` (`dtp-parse.ts`). Each yearly CSV is a full snapshot,
 * so a (year, kind) pair is replaced in one transaction. The year comes from the resource file name (`…-2025.csv`).
 * The Patrol Police XLSX tables (`registry.dtp_*_year`) are not loaded yet. See docs/road-safety-plan.md.
 *
 *   pnpm ingest:dtp                          # every yearly CSV of the dataset
 *   pnpm ingest:dtp --dry-run                # download + print counts, write nothing
 *   pnpm ingest:dtp --file ./x.csv --year 2025 --kind hazard   # one local CSV
 */
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { createDb, dtpHazardSection } from '@carplates/db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { parseHazardCsv } from './dtp-parse.js'
import type { HazardKind, HazardParse } from './dtp-parse.js'

const DATASET = '9b6a7292-b0cd-419e-8143-19da0661edfb'
const DATASET_PAGE = `https://data.gov.ua/dataset/${DATASET}`
const CKAN_URL = `https://data.gov.ua/api/3/action/package_show?id=${DATASET}`
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const BATCH = 500
/** The 2025 files hold 505 hazardous sections and 329 concentration places; far fewer means a broken export. */
const MIN_ROWS: Record<HazardKind, number> = { hazard: 100, concentration: 80 }

const PackageSchema = z.object({
  success: z.boolean(),
  result: z.object({
    resources: z.array(z.object({ url: z.string(), name: z.string().nullish(), format: z.string().nullish() }))
  })
})

type Args = { dryRun: boolean; file?: string; year?: number; kind?: HazardKind }

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--file') a.file = argv[++i]
    else if (arg === '--year') a.year = Number(argv[++i])
    else if (arg === '--kind') a.kind = argv[++i] === 'concentration' ? 'concentration' : 'hazard'
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

type Source = { name: string; year: number; kind: HazardKind; text: () => Promise<string> }

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} (dataset page: ${DATASET_PAGE})`)
  return res
}

/** The yearly `roadHazardousAreas-YYYY.csv` and `placesOfConcentrationOfRoadAccidents-YYYY.csv` resources, oldest year first. */
async function listSources(): Promise<Source[]> {
  const pkg = PackageSchema.parse(await (await fetchOk(CKAN_URL)).json())
  const sources: Source[] = []
  for (const r of pkg.result.resources) {
    const file = basename(new URL(r.url).pathname)
    const year = /(\d{4})\.csv$/i.exec(file)?.[1]
    const kind: HazardKind | null = /^roadhazardousareas/i.test(file)
      ? 'hazard'
      : /^placesofconcentration/i.test(file)
        ? 'concentration'
        : null
    if (year && kind)
      sources.push({ name: file, year: Number(year), kind, text: async () => (await fetchOk(r.url)).text() })
  }
  if (sources.length === 0) throw new Error(`no yearly hazard CSV in the dataset package (${DATASET_PAGE})`)
  return sources.sort((a, b) => a.year - b.year || a.kind.localeCompare(b.kind))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  let sources: Source[]
  if (args.file) {
    const file = args.file
    if (!args.year || !args.kind) throw new Error('--file needs --year and --kind (hazard | concentration)')
    sources = [{ name: basename(file), year: args.year, kind: args.kind, text: () => readFile(file, 'utf8') }]
  } else {
    sources = await listSources()
  }

  const parsed: { source: Source; result: HazardParse }[] = []
  for (const source of sources) {
    const result = parseHazardCsv(await source.text(), source.year, source.kind)
    log(
      `${source.name}: ${result.rows} row(s) -> ${result.sections.length} kept, ${result.invalid} invalid, ${result.noCoords} without coordinates`
    )
    if (!args.file && result.sections.length < MIN_ROWS[source.kind]) {
      throw new Error(
        `${source.name}: only ${result.sections.length} rows (< ${MIN_ROWS[source.kind]}) - file looks broken`
      )
    }
    parsed.push({ source, result })
  }
  if (args.dryRun) return

  const { db, close } = createDb()
  try {
    for (const { source, result } of parsed) {
      await db.transaction(async tx => {
        await tx
          .delete(dtpHazardSection)
          .where(and(eq(dtpHazardSection.year, source.year), eq(dtpHazardSection.kind, source.kind)))
        for (let i = 0; i < result.sections.length; i += BATCH) {
          await tx.insert(dtpHazardSection).values(result.sections.slice(i, i + BATCH))
        }
      })
      log(`${source.year} ${source.kind}: replaced with ${result.sections.length} row(s)`)
    }
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
