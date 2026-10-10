/**
 * UK MOT "Common faults" (stage G): aggregates the DVSA anonymised MOT results (OGL v3) into `registry.mot_*`. The yearly
 * ZIPs are streamed (never extracted, raw tests never stored); only counts per make / model / model year / mileage band stay.
 *
 *   pnpm ingest:mot -- --dir C:/Users/me/Downloads/UK_MOT      # aggregate every year found + load the tables
 *   pnpm ingest:mot -- --dir … --years 2022,2023               # only these years
 *   pnpm ingest:mot -- --dir … --dry-run                       # aggregate, print sizes, write nothing to the DB
 *   pnpm ingest:mot -- --dir … --reuse-aggregate               # skip the ZIP pass: load the last cached aggregate
 *   pnpm ingest:mot -- --dir … --refresh-census                # redo the per-year make/model census (cached otherwise)
 *   pnpm ingest:mot -- --from-csv seed-data/mot.csv.gz        # load the committed seed, no ZIPs needed
 *   pnpm ingest:mot -- --export-csv seed-data/mot.csv.gz       # dump the tables after a real ingest
 *
 * Download (not done by the script): https://data.dft.gov.uk/anonymised-mot-test/test_data/dft_test_result_<Y>.zip,
 * …/dft_test_item_<Y>.zip and https://data.dft.gov.uk/anonymised-mot-test/lookup.zip — put them in one folder.
 */
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { createDb } from '@carplates/db'
import { MOT_GROUP_CODES } from '@carplates/shared'

import { type MotFiles, MotAggregator, cachedCensus } from './mot-aggregate.js'
import { csvPartCount } from './mot-zip.js'
import { buildReasonIndex, loadMotLookup } from './mot-lookup.js'
import { type MotData, exportMot, importMot, saveMot } from './mot-store.js'

const log = (...m: unknown[]): void => {
  console.log(...m)
}

const CACHE_DIR = resolve(import.meta.dirname, '../.data/mot')

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: join(homedir(), 'Downloads', 'UK_MOT') },
    years: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'refresh-census': { type: 'boolean', default: false },
    'reuse-aggregate': { type: 'boolean', default: false },
    'from-csv': { type: 'string' },
    'export-csv': { type: 'string' }
  }
})

/** Year files present in the folder (both the result and the item ZIP must exist). */
function findFiles(dir: string, only: number[] | null): MotFiles[] {
  const names = new Set(readdirSync(dir))
  const files: MotFiles[] = []
  for (const name of names) {
    const m = /^dft_test_result_(\d{4})\.zip$/.exec(name)
    if (!m) continue
    const year = Number(m[1])
    const item = `dft_test_item_${year}.zip`
    if (only && !only.includes(year)) continue
    if (!names.has(item)) {
      log(`skip ${year}: ${item} is missing`)
      continue
    }
    const itemPath = join(dir, item)
    files.push({ year, result: join(dir, name), item: itemPath, scattered: csvPartCount(itemPath, 'test_item') > 1 })
  }
  return files.sort((a, b) => a.year - b.year)
}

/** Years before this use the pre-May-2018 layout / straddle the EU directive (decision 0 in DATASETS_PLAN.md). */
const MIN_SUPPORTED_YEAR = 2019

async function aggregate(dir: string, only: number[] | null, refreshCensus: boolean): Promise<MotData> {
  const all = findFiles(dir, only)
  const files = all.filter(f => f.year >= MIN_SUPPORTED_YEAR)
  for (const f of all.filter(f => f.year < MIN_SUPPORTED_YEAR))
    log(`skip ${f.year}: before ${MIN_SUPPORTED_YEAR} (old layout)`)
  if (files.length === 0) throw new Error(`no dft_test_result_<year>.zip / dft_test_item_<year>.zip pairs in ${dir}`)
  log(`years: ${files.map(f => f.year).join(', ')}`)

  const lookup = await loadMotLookup(dir)
  const reasons = buildReasonIndex(lookup, MOT_GROUP_CODES)
  log(`lookup: ${lookup.size} rfr ids → ${reasons.reasons.length} reason codes`)

  // census over all years decides which make/models are stored
  const census: Awaited<ReturnType<typeof cachedCensus>> = {}
  for (const f of files) {
    const c = await cachedCensus(f, CACHE_DIR, refreshCensus)
    for (const [id, rec] of Object.entries(c)) {
      const into = (census[id] ??= { make: rec.make, model: rec.model, tests: 0, spellings: {} })
      if (rec.tests > into.tests / 2) {
        into.make = rec.make
        into.model = rec.model
      }
      into.tests += rec.tests
    }
    log(`census ${f.year}: ${Object.keys(c).length} keys`)
  }

  const agg = new MotAggregator(census, reasons)
  log(`tracking ${agg.trackedCount} make/models (issue counters ${(agg.issueBytes / 1e6).toFixed(0)} MB)`)
  for (const f of files) await agg.addYear(f, log)
  return { ...agg.finish(), years: files.map(f => f.year) }
}

function report(rows: MotData): void {
  const bytes = (v: unknown): number => JSON.stringify(v).length
  log('\n== size (dry-run estimate; jsonb ≈ its JSON text)')
  log(`mot_keys     ${rows.keys.length} rows`)
  log(`mot_stats    ${rows.stats.length} rows`)
  log(
    `mot_issues   ${rows.issues.length} rows, jsonb ${(bytes(rows.issues.map(i => [i.groups, i.reasons])) / 1e6).toFixed(1)} MB`
  )
  log(`mot_baseline ${rows.baseline.length} rows`)
  log(`mot_reasons  ${rows.reasons.length} rows`)
  const byKind: Record<string, number> = {}
  for (const k of rows.keys) byKind[k.kind] = (byKind[k.kind] ?? 0) + 1
  log('keys by kind', JSON.stringify(byKind))
  log('diagnostics', JSON.stringify(rows.diagnostics))
}

async function main(): Promise<void> {
  if (values['from-csv'] || values['export-csv']) {
    const { db, close } = createDb()
    try {
      if (values['export-csv']) await exportMot(db, values['export-csv'])
      else await importMot(db, values['from-csv']!)
    } finally {
      await close()
    }
    return
  }

  const dir = resolve(values.dir!)
  if (!existsSync(dir)) throw new Error(`folder not found: ${dir}`)
  const aggPath = join(CACHE_DIR, 'aggregate.json')
  let rows: MotData
  if (values['reuse-aggregate'] && existsSync(aggPath)) {
    rows = JSON.parse(await readFile(aggPath, 'utf8')) as MotData
    log(`reusing ${aggPath}`)
  } else {
    const only = values.years ? values.years.split(',').map(Number) : null
    rows = await aggregate(dir, only, values['refresh-census']!)
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(aggPath, JSON.stringify(rows))
    log(`aggregate cached in ${aggPath}`)
  }
  report(rows)
  if (values['dry-run']) return

  const { db, close } = createDb()
  try {
    await saveMot(db, rows)
    log('tables replaced')
  } finally {
    await close()
  }
}

await main()
