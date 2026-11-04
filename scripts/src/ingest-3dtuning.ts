/**
 * Loads the 3DTuning car-page index (docs/tuning-3d-plan.md) into `registry.tuning_links`: make / model / body / generation / start year
 * and the locale-less page path, parsed from https://www.3dtuning.com/sitemap.xml (about 4.9 MB, one line). No page is scraped and none of
 * their content is copied: the table only lets us link out ("Customize in 3D"). The matching rules live in
 * `packages/shared/src/tuning3d.ts`; this script only loads the data and measures how well it matches ours.
 *
 * The sitemap is cached in scripts/.data/tuning3d/ (gitignored).
 *
 *   pnpm ingest:3dtuning                 # fetch (cached), replace the table
 *   pnpm ingest:3dtuning --dry-run       # fetch + summary, write nothing
 *   pnpm ingest:3dtuning --refresh       # ignore the cached sitemap
 *   pnpm ingest:3dtuning --match-report  # match rate of our catalog (make / model / year) against the sitemap pages; read-only
 *   pnpm ingest:3dtuning --match-report --top 40
 *   pnpm ingest:3dtuning --export-csv seed-data/3dtuning-links.csv.gz   # dump the table
 *   pnpm ingest:3dtuning --from-csv seed-data/3dtuning-links.csv.gz     # load a dump (replaces the table), no 3DTuning call
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb, tuningLinks } from '@carplates/db'
import type { Db, TuningLinkInsert } from '@carplates/db'
import { buildTuningIndex, catalogStatsSchema, matchTuning, tuningKey } from '@carplates/shared'
import type { Tuning3dPage, TuningMatch } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { exportTuningLinks, importTuningLinks } from './tuning-csv.js'
import { SITEMAP_URL, parseSitemap } from './tuning3d-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'tuning3d')
const SITEMAP_CACHE = join(DATA_DIR, 'sitemap.xml')
const TIMEOUT_MS = 120_000
const BATCH = 1000

type Args = {
  dryRun: boolean
  refresh: boolean
  matchReport: boolean
  top: number
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, refresh: false, matchReport: false, top: 25 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--match-report') a.matchReport = true
    else if (arg === '--top') a.top = Number(argv[++i]) || a.top
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function loadSitemap(refresh: boolean): Promise<string> {
  if (!refresh && existsSync(SITEMAP_CACHE)) return readFile(SITEMAP_CACHE, 'utf8')
  const res = await fetch(SITEMAP_URL, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`3DTuning sitemap answered ${res.status}`)
  const xml = await res.text()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(SITEMAP_CACHE, xml)
  return xml
}

function summary(pages: readonly Tuning3dPage[]): void {
  const makes = new Set(pages.map(p => p.makeSlug))
  const models = new Set(pages.map(p => `${p.makeSlug}/${p.modelSlug}`))
  log(`${pages.length} car page(s), ${makes.size} make(s), ${models.size} make+model pair(s)`)
}

async function save(db: Db, pages: readonly Tuning3dPage[]): Promise<void> {
  const rows: TuningLinkInsert[] = pages.map(p => ({ ...p, updatedAt: new Date() }))
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.tuning_links`)
    for (let i = 0; i < rows.length; i += BATCH)
      await tx
        .insert(tuningLinks)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
  })
  log(`written ${rows.length} page(s) to registry.tuning_links`)
}

type CatalogCell = {
  makeSlug: string
  modelSlug: string
  modelName: string
  year: number
  n: number
  body: string | null
}

/**
 * Every (catalog make, model, make year, registry body) with its car count: the population a plate page would look up. The catalog keeps
 * the body split per model, not per year, so each year's count is shared out by the model's body shares (an estimate).
 */
async function catalogCells(db: Db): Promise<CatalogCell[]> {
  const { rows } = await db.execute<{ make_slug: string; model_slug: string; model_name: string; stats: unknown }>(
    sql`SELECT make_slug, model_slug, model_name, stats FROM registry.catalog_model`
  )
  const cells: CatalogCell[] = []
  const maxYear = new Date().getFullYear() + 1
  for (const r of rows) {
    const parsed = catalogStatsSchema.safeParse(r.stats)
    if (!parsed.success) continue
    const bodies = parsed.data.body
    const bodyTotal = bodies.reduce((sum, [, c]) => sum + c, 0)
    for (const [year, n] of parsed.data.years) {
      const y = Number(year)
      if (y < 1950 || y > maxYear) continue
      const base = { makeSlug: r.make_slug, modelSlug: r.model_slug, modelName: r.model_name, year: y }
      if (!bodyTotal) cells.push({ ...base, n, body: null })
      else for (const [body, c] of bodies) cells.push({ ...base, n: Math.round((n * c) / bodyTotal), body })
    }
  }
  return cells
}

const pct = (n: number, total: number): string => `${((n / total) * 100).toFixed(2)}%`
const top = <K>(m: Map<K, number>, k: number): [K, number][] => [...m].sort((a, b) => b[1] - a[1]).slice(0, k)
const add = <K>(m: Map<K, number>, key: K, n: number): void => {
  m.set(key, (m.get(key) ?? 0) + n)
}

function matchReport(cells: readonly CatalogCell[], pages: readonly Tuning3dPage[], topN: number): void {
  const index = buildTuningIndex(pages)
  const bodiesOf = new Map<string, Set<string>>()
  for (const p of pages) {
    const key = `${tuningKey(p.makeSlug)}/${tuningKey(p.modelSlug)}`
    bodiesOf.set(key, (bodiesOf.get(key) ?? new Set()).add(p.body.replace(/^\d\.door\./, '')))
  }

  const total = cells.reduce((a, c) => a + c.n, 0)
  const kinds = new Map<string, number>()
  const misses = new Map<string, Map<string, number>>()
  const ambiguous = new Map<string, number>()
  const multiBodyUnique = { n: 0 }
  const hitModels = new Set<string>()
  const allModels = new Set<string>()

  for (const c of cells) {
    const result: TuningMatch = matchTuning(index, {
      make: c.makeSlug,
      models: [c.modelSlug, c.modelName],
      year: c.year,
      body: c.body
    })
    const label = result.kind === 'none' ? `none: ${result.reason}` : result.kind
    add(kinds, label, c.n)
    const model = `${c.makeSlug}/${c.modelSlug}`
    allModels.add(model)
    if (result.kind === 'unique' || result.kind === 'same-generation') hitModels.add(model)
    if (result.kind === 'none') {
      const by = misses.get(result.reason) ?? new Map<string, number>()
      add(by, result.reason === 'make' ? c.makeSlug : model, c.n)
      misses.set(result.reason, by)
    } else if (result.kind === 'ambiguous') add(ambiguous, model, c.n)
    else if (result.kind === 'unique') {
      const own = bodiesOf.get(`${tuningKey(result.page.makeSlug)}/${tuningKey(result.page.modelSlug)}`)
      if ((own?.size ?? 0) > 1) multiBodyUnique.n += c.n
    }
  }

  log(`\ncatalog population: ${cells.length} make+model+year cell(s), ${total} cars, ${allModels.size} model(s)`)
  log('match result, weighted by cars:')
  for (const [label, n] of top(kinds, 20)) log(`  ${label.padEnd(22)} ${String(n).padStart(10)}  ${pct(n, total)}`)
  const confident = (kinds.get('unique') ?? 0) + (kinds.get('same-generation') ?? 0)
  log(
    `\nlinkable (unique + same-generation): ${confident} cars = ${pct(confident, total)}; models with a link: ${hitModels.size}/${allModels.size}`
  )
  log(`unique-only: ${pct(kinds.get('unique') ?? 0, total)}`)
  log(
    `unique matches on models whose pages span several bodies (body could be wrong): ${multiBodyUnique.n} cars = ${pct(multiBodyUnique.n, total)}`
  )

  for (const [reason, by] of misses) {
    const sum = [...by.values()].reduce((a, n) => a + n, 0)
    log(`\ntop misses, ${reason} (${sum} cars, ${pct(sum, total)}):`)
    for (const [key, n] of top(by, topN)) log(`  ${key.padEnd(34)} ${String(n).padStart(9)}`)
  }
  log('\ntop ambiguous (different generations starting the same year):')
  for (const [key, n] of top(ambiguous, 10)) log(`  ${key.padEnd(34)} ${String(n).padStart(9)}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.exportCsv || args.fromCsv) {
    const { db, close } = createDb()
    try {
      if (args.exportCsv) await exportTuningLinks(db, args.exportCsv)
      else if (args.fromCsv) await importTuningLinks(db, args.fromCsv)
    } finally {
      await close()
    }
    return
  }

  const pages = parseSitemap(await loadSitemap(args.refresh))
  summary(pages)

  if (args.matchReport) {
    const { db, close } = createDb()
    try {
      matchReport(await catalogCells(db), pages, args.top)
    } finally {
      await close()
    }
    return
  }
  if (args.dryRun) {
    log('dry-run: nothing written')
    return
  }
  const { db, close } = createDb()
  try {
    await save(db, pages)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
