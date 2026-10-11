/**
 * Loads the Wikipedia spec catalogue (dimensions, drive, engines with power) per generation into `registry.model_spec_wiki`.
 * Targets = every generation of `registry.model_generations` (stage I: the top registry models). Per generation: the full
 * wikitext of its article in en, then the same article in ru / uk / de / the make's home edition (langlinks from the en page),
 * parsed with `parseWikiSpecs` (infobox + body tables) and merged block by block (`wikispecs-merge.ts`). Dimensions are left
 * NULL for makes/models RDW has. Responses are cached in `scripts/.data/wikispecs/` (resumable; `--refresh` fetches again);
 * `wikispecs-overrides.csv` pins an article title for one generation and language.
 *
 *   pnpm ingest:wikispecs                                  # all generations, replaces the rows of each processed model
 *   pnpm ingest:wikispecs -- --limit 20 --dry-run          # first 20 models, print a coverage table, write nothing
 *   pnpm ingest:wikispecs -- --only "honda civic"          # one model (make key + model key words, as in the table)
 *   pnpm ingest:wikispecs -- --export-csv ./x.csv.gz       # dump the table
 *   pnpm ingest:wikispecs -- --from-csv ./x.csv.gz         # load a dump, no network
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, modelSpecWiki } from '@carplates/db'
import type { Db, ModelSpecWikiInsert, WikiEngineJson } from '@carplates/db'
import { parseWikiSpecs } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { and, eq, sql } from 'drizzle-orm'

import { mergeEditions, wikiLangChain, type Edition } from './wikispecs-merge.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (https://carsua.app; rukrak86@gmail.com)'
const CACHE_DIR = new URL('../.data/wikispecs/', import.meta.url)
const OVERRIDES = new URL('./wikispecs-overrides.csv', import.meta.url)
const DELAY_MS = 250 // one request in flight, ~4 per second
const BATCH = 500

type Args = { limit: number; only?: string; dryRun: boolean; refresh: boolean; exportCsv?: string; fromCsv?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: Infinity, dryRun: false, refresh: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--limit') a.limit = Number(argv[++i])
    else if (arg === '--only') a.only = argv[++i]?.toLowerCase()
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

let refresh = false

async function getJson<T>(url: string): Promise<T> {
  const file = fileURLToPath(new URL(`${createHash('sha1').update(url).digest('hex')}.json`, CACHE_DIR))
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as T
    } catch {
      // not cached yet
    }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(DELAY_MS)
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) {
      await sleep(Number(res.headers.get('retry-after') ?? 0) * 1000 || 2000 * 2 ** attempt)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    const data = (await res.json()) as T
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(data))
    return data
  }
  throw new Error(`gave up after retries: ${url}`)
}

type Page = {
  title: string
  missing?: boolean
  langlinks?: { lang: string; title: string }[]
  revisions?: { revid: number; slots: { main: { content: string } } }[]
}

/** Full article wikitext (the body tables live far below the lead); the en page also lists its langlinks. */
async function fetchPage(lang: string, title: string, withLinks: boolean): Promise<Page | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: withLinks ? 'revisions|langlinks' : 'revisions',
    rvprop: 'ids|content',
    rvslots: 'main',
    redirects: '1',
    titles: title,
    ...(withLinks ? { lllimit: '500' } : {})
  })
  const data = await getJson<{ query?: { pages?: Page[] } }>(
    `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`
  )
  const page = data.query?.pages?.[0]
  return page && !page.missing ? page : null
}

type Generation = {
  makeKey: string
  modelKey: string
  make: string
  model: string
  yearFrom: number
  code: string
  label: string
  wikiTitle: string
  wikidataId: string
  source: string
}

type Override = { lang: string; title: string }

/** `make_key|model_key|year_from` → pinned titles per language. */
async function loadOverrides(): Promise<Map<string, Override[]>> {
  const out = new Map<string, Override[]>()
  let raw: string
  try {
    raw = await readFile(OVERRIDES, 'utf8')
  } catch {
    return out
  }
  for (const r of parseCsv(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[]) {
    const key = `${r.make_key}|${r.model_key}|${r.year_from}`
    out.set(key, [...(out.get(key) ?? []), { lang: r.lang!, title: r.title! }])
  }
  return out
}

async function loadGenerations(db: Db): Promise<Generation[]> {
  const { rows } = (await db.execute(
    sql`SELECT make_key, model_key, make, model, year_from, code, label, wiki_title, wikidata_id, source
        FROM registry.model_generations ORDER BY make_key, model_key, year_from`
  )) as unknown as { rows: Record<string, string | number>[] }
  return rows.map(r => ({
    makeKey: String(r.make_key),
    modelKey: String(r.model_key),
    make: String(r.make),
    model: String(r.model),
    yearFrom: Number(r.year_from),
    code: String(r.code),
    label: String(r.label),
    wikiTitle: String(r.wiki_title),
    wikidataId: String(r.wikidata_id),
    source: String(r.source)
  }))
}

async function loadRdwModels(db: Db): Promise<Set<string>> {
  const { rows } = (await db.execute(sql`SELECT DISTINCT make_key, model_key FROM registry.rdw_specs`)) as unknown as {
    rows: { make_key: string; model_key: string }[]
  }
  return new Set(rows.map(r => `${r.make_key}|${r.model_key}`))
}

/** The parsed editions of one generation, in chain order. A missing edition or a failed fetch just drops out. */
async function editionsOf(g: Generation, overrides: Map<string, Override[]>): Promise<Edition[]> {
  const pinned = overrides.get(`${g.makeKey}|${g.modelKey}|${g.yearFrom}`) ?? []
  const pin = (lang: string): string | undefined => pinned.find(o => o.lang === lang)?.title
  const en = await fetchPage('en', pin('en') ?? g.wikiTitle, true)
  if (!en) return []
  // `headings` generations share one series article: tables only count under the heading that names the generation.
  const opts = { code: g.code || g.label, series: g.source === 'headings' }
  const out: Edition[] = []
  for (const lang of wikiLangChain(g.makeKey)) {
    const title = pin(lang) ?? en.langlinks?.find(l => l.lang === lang)?.title
    const page = lang === 'en' ? en : title ? await fetchPage(lang, title, false).catch(() => null) : null
    const rev = page?.revisions?.[0]
    if (!page || !rev) continue
    out.push({
      lang,
      title: page.title,
      revid: rev.revid ?? null,
      specs: parseWikiSpecs(rev.slots.main.content, { lang, ...opts })
    })
  }
  return out
}

/** Replaces the rows of one (make, model), so an interrupted run keeps what it has finished. */
async function saveModel(db: Db, makeKey: string, modelKey: string, rows: ModelSpecWikiInsert[]): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(modelSpecWiki).where(and(eq(modelSpecWiki.makeKey, makeKey), eq(modelSpecWiki.modelKey, modelKey)))
    if (rows.length > 0) await tx.insert(modelSpecWiki).values(rows).onConflictDoNothing()
  })
}

const FIELDS = ['lengthMm', 'wheelbaseMm', 'kerbKg', 'fuelTankL', 'layout', 'transmission'] as const

async function run(db: Db, args: Args): Promise<void> {
  const all = await loadGenerations(db)
  const byModel = new Map<string, Generation[]>()
  for (const g of all) {
    const key = `${g.makeKey}|${g.modelKey}`
    byModel.set(key, [...(byModel.get(key) ?? []), g])
  }
  let models = [...byModel.entries()]
  if (args.only) {
    const want = args.only.replace(/\s+/g, '')
    models = models.filter(([k]) => k.replace('|', '') === want)
  }
  models = models.slice(0, args.limit)
  if (models.length === 0) return log('no matching models in registry.model_generations (run ingest:generations first)')

  const overrides = await loadOverrides()
  const rdw = await loadRdwModels(db)
  const counts = Object.fromEntries(FIELDS.map(f => [f, 0])) as Record<(typeof FIELDS)[number], number>
  let engines = 0
  let withPower = 0
  let stored = 0
  let total = 0
  for (const [key, gens] of models) {
    const [makeKey, modelKey] = key.split('|') as [string, string]
    const rows: ModelSpecWikiInsert[] = []
    try {
      for (const g of gens) {
        const row = mergeEditions(g, await editionsOf(g, overrides), rdw.has(key))
        total++
        if (!row) continue
        rows.push(row)
        for (const f of FIELDS) if (row[f]) counts[f]++
        const list = row.engines as WikiEngineJson[]
        if (list.length > 0) engines++
        if (list.some(e => e.powerKw !== null)) withPower++
      }
      if (!args.dryRun) await saveModel(db, makeKey, modelKey, rows)
      stored += rows.length
      log(
        `${rows.length > 0 ? '✓' : '·'} ${gens[0]!.make} ${gens[0]!.model}${rdw.has(key) ? ' [RDW]' : ''}: ` +
          `${rows.length}/${gens.length} gens ` +
          rows.map(r => `${r.yearFrom}:${r.srcLang || '-'}/${r.enginesLang || '-'}/${r.driveLang || '-'}`).join(' ')
      )
    } catch (err) {
      log(`! ${gens[0]!.make} ${gens[0]!.model}: ${(err as Error).message}`)
    }
  }
  const pct = (n: number): string => `${((100 * n) / Math.max(total, 1)).toFixed(0)} %`
  log(
    `\n${models.length} models, ${total} generations, ${stored} with data. Of all generations: ` +
      [
        ...FIELDS.map(f => `${f} ${pct(counts[f])}`),
        `engines ${pct(engines)}`,
        `engines with power ${pct(withPower)}`
      ].join(', ')
  )
  log(args.dryRun ? 'dry-run: nothing written' : `stored ${stored} row(s)`)
}

const CSV_COLUMNS = [
  'make_key',
  'model_key',
  'year_from',
  'wheelbase_mm',
  'length_mm',
  'width_mm',
  'height_mm',
  'kerb_kg',
  'fuel_tank_l',
  'layout',
  'transmission',
  'engines',
  'src_lang',
  'src_title',
  'revid',
  'engines_lang',
  'engines_title',
  'drive_lang',
  'drive_title',
  'wikidata_id'
] as const

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(modelSpecWiki)
    .orderBy(modelSpecWiki.makeKey, modelSpecWiki.modelKey, modelSpecWiki.yearFrom)
  const csv = stringifyCsv(
    rows.map(r => ({
      make_key: r.makeKey,
      model_key: r.modelKey,
      year_from: r.yearFrom,
      wheelbase_mm: r.wheelbaseMm ?? '',
      length_mm: r.lengthMm ?? '',
      width_mm: r.widthMm ?? '',
      height_mm: r.heightMm ?? '',
      kerb_kg: r.kerbKg ?? '',
      fuel_tank_l: r.fuelTankL ?? '',
      layout: r.layout,
      transmission: r.transmission,
      engines: JSON.stringify(r.engines),
      src_lang: r.srcLang,
      src_title: r.srcTitle,
      revid: r.revid ?? '',
      engines_lang: r.enginesLang,
      engines_title: r.enginesTitle,
      drive_lang: r.driveLang,
      drive_title: r.driveTitle,
      wikidata_id: r.wikidataId
    })),
    { header: true, columns: [...CSV_COLUMNS] }
  )
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} row(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

const num = (s: string | undefined): number | null => (s ? Number(s) : null)

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const records = parseCsv(isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8'), {
    columns: true
  }) as Record<string, string>[]
  const rows: ModelSpecWikiInsert[] = records.map(r => ({
    makeKey: r.make_key!,
    modelKey: r.model_key!,
    yearFrom: Number(r.year_from),
    wheelbaseMm: num(r.wheelbase_mm),
    lengthMm: num(r.length_mm),
    widthMm: num(r.width_mm),
    heightMm: num(r.height_mm),
    kerbKg: num(r.kerb_kg),
    fuelTankL: num(r.fuel_tank_l),
    layout: r.layout ?? '',
    transmission: r.transmission ?? '',
    engines: r.engines ? (JSON.parse(r.engines) as WikiEngineJson[]) : [],
    srcLang: r.src_lang ?? '',
    srcTitle: r.src_title ?? '',
    revid: num(r.revid),
    enginesLang: r.engines_lang ?? '',
    enginesTitle: r.engines_title ?? '',
    driveLang: r.drive_lang ?? '',
    driveTitle: r.drive_title ?? '',
    wikidataId: r.wikidata_id ?? ''
  }))
  // A seed is the whole table: replace it.
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.model_spec_wiki`)
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx
        .insert(modelSpecWiki)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
    }
  })
  log(`loaded ${rows.length} row(s) from ${path}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  refresh = args.refresh
  const { db, close } = createDb()
  try {
    if (args.exportCsv) await exportToCsv(db, args.exportCsv)
    else if (args.fromCsv) await importFromCsv(db, args.fromCsv)
    else await run(db, args)
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
