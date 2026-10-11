/**
 * Loads car generations (code, label, production years, body styles, platform) into `registry.model_generations`.
 * Targets = the most-registered (brand, model) pairs of `stats_model_grouped`. Per target: Wikipedia search → series article
 * (+ Wikidata id) → generation list from Wikidata P179 (CC0), else Wikipedia "Series (code)" titles, else the section
 * headings of the main article → years / body styles / platform from each generation's infobox (CC BY-SA, facts only).
 * Responses are cached in `scripts/.data/generations/` (`--refresh` fetches again).
 *
 *   pnpm ingest:generations                              # top 300 pairs, replaces their rows
 *   pnpm ingest:generations -- --limit 50 --dry-run      # print the table + coverage, write nothing
 *   pnpm ingest:generations -- --only "toyota camry"     # one pair (brand model), no coverage
 *   pnpm ingest:generations -- --export-csv ./x.csv.gz   # dump the table
 *   pnpm ingest:generations -- --from-csv ./x.csv.gz     # load a dump, no network
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'

import { createDb, modelGenerations } from '@carplates/db'
import type { Db, ModelGenerationInsert } from '@carplates/db'
import { makeKey, modelKey, wikiSearchName } from '@carplates/shared'
import { parse as parseCsv } from 'csv-parse/sync'
import { stringify as stringifyCsv } from 'csv-stringify/sync'
import { and, eq, sql } from 'drizzle-orm'

import {
  finishGenerations,
  generationCode,
  generationName,
  headingGenerations,
  infoboxField,
  infoboxYears,
  parseYearRange,
  ordinalLabel,
  trustedHeadings,
  type Generation
} from './generations-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0 (https://carsua.app; rukrak86@gmail.com)'
const CACHE_DIR = new URL('../.data/generations/', import.meta.url)
const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const DELAY_MS = 250
const DEFAULT_LIMIT = 300

type Args = { limit: number; only?: string; dryRun: boolean; refresh: boolean; exportCsv?: string; fromCsv?: string }

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: DEFAULT_LIMIT, dryRun: false, refresh: false }
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
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(DELAY_MS)
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) {
      await sleep(Number(res.headers.get('retry-after') ?? 0) * 1000 || 2000 * (attempt + 1))
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

const wikiUrl = (params: Record<string, string>): string =>
  `${WIKI_API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params }).toString()}`

type Target = { make: string; model: string; query: string; cars: number }

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
const titleCase = (s: string): string =>
  s.replace(/(^|[\s-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())

/** Most-registered (brand, model) pairs, spellings folded through the wiki search aliases; Cyrillic-only names are skipped. */
async function loadTargets(db: Db, limit: number): Promise<Target[]> {
  const { rows } = (await db.execute(
    sql`SELECT lower(brand) AS brand, lower(model) AS model, sum(distinct_plates)::bigint AS cars
        FROM registry.stats_model_grouped GROUP BY 1, 2 ORDER BY 3 DESC LIMIT ${limit * 4}`
  )) as unknown as { rows: { brand: string; model: string; cars: string }[] }

  const byQuery = new Map<string, Target>()
  for (const r of rows) {
    const alias = wikiSearchName(r.brand, r.model)
    const brandWord = r.brand.split(' ')[0] ?? r.brand
    const make = alias?.brand ?? titleCase(brandWord)
    const model = alias?.model ?? r.model
    const query = `${make} ${model}`
    if (/[а-яіїєґ]/i.test(query) || !model.trim()) continue
    const key = norm(query)
    const prev = byQuery.get(key)
    if (prev) prev.cars += Number(r.cars)
    else byQuery.set(key, { make, model, query, cars: Number(r.cars) })
  }
  return [...byQuery.values()].sort((a, b) => b.cars - a.cars).slice(0, limit)
}

type SearchResponse = { query?: { pages?: { title: string; pageprops?: { wikibase_item?: string } }[] } }
type RevisionResponse = {
  query?: {
    pages?: {
      title: string
      missing?: boolean
      pageprops?: { wikibase_item?: string }
      revisions?: { slots: { main: { content: string } } }[]
    }[]
  }
}

/** The series article for a target: the shortest search hit that contains the model and the brand, with no "(…)" suffix. */
async function findSeries(t: Target): Promise<{ title: string; qid: string; wikitext: string } | null> {
  const found = await getJson<SearchResponse>(
    wikiUrl({
      action: 'query',
      generator: 'search',
      gsrsearch: t.query,
      gsrlimit: '6',
      gsrnamespace: '0',
      prop: 'pageprops',
      ppprop: 'wikibase_item'
    })
  )
  const brand = norm(t.make)
  const model = norm(t.model)
  const hit = (found.query?.pages ?? [])
    .filter(p => !p.title.includes('(') && norm(p.title).includes(model) && norm(p.title).includes(brand))
    .sort((a, b) => a.title.length - b.title.length)[0]
  if (!hit) return null

  const rev = await getJson<RevisionResponse>(
    wikiUrl({
      action: 'query',
      prop: 'revisions|pageprops',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: hit.title,
      ppprop: 'wikibase_item'
    })
  )
  const page = rev.query?.pages?.[0]
  const wikitext = page?.revisions?.[0]?.slots.main.content ?? ''
  const qid = page?.pageprops?.wikibase_item ?? hit.pageprops?.wikibase_item ?? ''
  return page && !page.missing ? { title: page.title, qid, wikitext } : null
}

type SparqlResponse = { results: { bindings: { g: { value: string }; title: { value: string } }[] } }

/** Wikidata generation items (P179 "part of series") that have an English article. */
async function wikidataGenerations(qid: string): Promise<{ title: string; wikidataId: string }[]> {
  if (!qid) return []
  const sparql = `SELECT ?g ?title WHERE { ?g wdt:P179 wd:${qid}; wdt:P31 wd:Q3231690 .
    ?a schema:about ?g; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title } LIMIT 80`
  const data = await getJson<SparqlResponse>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  )
  return data.results.bindings.map(b => ({ title: b.title.value, wikidataId: b.g.value.split('/').pop()! }))
}

/** Articles named "Series (code)" that Wikidata does not link as generations (BMW 3 Series (E36)). */
async function prefixGenerations(seriesTitle: string): Promise<{ title: string; wikidataId: string }[]> {
  const data = await getJson<{ query?: { prefixsearch?: { title: string }[] } }>(
    wikiUrl({ action: 'query', list: 'prefixsearch', pssearch: `${seriesTitle} (`, pslimit: '40' })
  )
  return (data.query?.prefixsearch ?? [])
    .filter(p => p.title.startsWith(`${seriesTitle} (`) && generationCode(p.title, seriesTitle) !== null)
    .map(p => ({ title: p.title, wikidataId: '' }))
}

/** Lead section (infobox) of each article, 20 titles per request. */
async function leadSections(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let i = 0; i < titles.length; i += 20) {
    const data = await getJson<RevisionResponse>(
      wikiUrl({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        rvsection: '0',
        redirects: '1',
        titles: titles.slice(i, i + 20).join('|')
      })
    )
    for (const p of data.query?.pages ?? []) out.set(p.title, p.revisions?.[0]?.slots.main.content ?? '')
  }
  return out
}

async function fromArticles(
  seriesTitle: string,
  list: { title: string; wikidataId: string }[],
  source: Generation['source']
): Promise<Generation[]> {
  const named = list.flatMap(g => {
    const name = generationName(g.title, seriesTitle)
    return name ? [{ ...g, ...name }] : []
  })
  const usable = named
  const leads = await leadSections(usable.map(g => g.title))
  const out: Generation[] = []
  for (const g of usable) {
    const lead = leads.get(g.title) ?? ''
    const years = infoboxYears(lead)
    if (!years) continue
    out.push({
      code: g.code,
      label: g.label,
      yearFrom: years.from,
      yearTo: years.to ?? null,
      bodyStyles: infoboxField(lead, 'body_style').slice(0, 80),
      platform: infoboxField(lead, 'platform').slice(0, 60),
      wikiTitle: g.title,
      wikidataId: g.wikidataId,
      source
    })
  }
  return out
}

/** Generations of one target, or [] when Wikipedia has fewer than two with a start year (one row says nothing). */
async function resolve(t: Target): Promise<{ gens: Generation[]; target: Target }> {
  const series = await findSeries(t)
  if (!series) return { gens: [], target: t }

  let gens = await fromArticles(series.title, await wikidataGenerations(series.qid), 'wikidata')
  if (gens.length < 2) {
    const viaPrefix = await fromArticles(series.title, await prefixGenerations(series.title), 'prefix')
    if (viaPrefix.length > gens.length) gens = viaPrefix
  }
  if (gens.length < 2) {
    const headings = trustedHeadings(headingGenerations(series.wikitext))
    if (headings.length > gens.length) {
      gens = headings.map(h => ({
        code: h.code,
        label: h.label,
        yearFrom: h.yearFrom,
        yearTo: null,
        bodyStyles: '',
        platform: '',
        wikiTitle: series.title,
        wikidataId: series.qid,
        source: 'headings'
      }))
    }
  }
  const finished = finishGenerations(gens)
  // The last generation has no next start to end it: a model whose main article gives a production end (Laguna 1993–2015)
  // ends there; only a still-produced model stays open.
  const last = finished.at(-1)
  const seriesEnd = parseYearRange(infoboxField(series.wikitext, 'production'))?.to
  if (last && last.yearTo === null && seriesEnd && seriesEnd >= last.yearFrom) last.yearTo = seriesEnd
  if (finished.length < 2) return { gens: [], target: t }
  return {
    gens: finished.map((g, i) => ({ ...g, label: g.label && !/^Q\d+$/.test(g.label) ? g.label : ordinalLabel(i + 1) })),
    target: { ...t, ...displayName(t, series.title) }
  }
}

/** "Škoda" / "Octavia" from the article title when it starts with the target's make; the registry spelling otherwise. */
function displayName(t: Target, title: string): Pick<Target, 'make' | 'model'> {
  const makeWords = t.make.split(' ').length
  const words = title.split(' ')
  const make = words.slice(0, makeWords).join(' ')
  const model = words.slice(makeWords).join(' ')
  return norm(make) === norm(t.make) && model ? { make, model } : { make: t.make, model: t.model }
}

/** Keys come from the target's registry spelling (what the matcher sees); the names shown come from the article title. */
const toInsert = (key: Target, t: Target, g: Generation): ModelGenerationInsert => ({
  makeKey: makeKey(key.make) ?? norm(key.make),
  modelKey: modelKey(key.model) ?? norm(key.model),
  make: t.make,
  model: t.model,
  yearFrom: g.yearFrom,
  yearTo: g.yearTo,
  code: g.code,
  label: g.label,
  bodyStyles: g.bodyStyles,
  platform: g.platform,
  wikiTitle: g.wikiTitle,
  wikidataId: g.wikidataId,
  source: g.source
})

const BATCH = 500

/** Replaces the rows of the processed (make, model) keys, so a partial run never wipes the rest. */
async function save(
  db: Db,
  processed: { makeKey: string; modelKey: string }[],
  rows: ModelGenerationInsert[]
): Promise<void> {
  await db.transaction(async tx => {
    for (const p of processed) {
      await tx
        .delete(modelGenerations)
        .where(and(eq(modelGenerations.makeKey, p.makeKey), eq(modelGenerations.modelKey, p.modelKey)))
    }
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx
        .insert(modelGenerations)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
    }
  })
  log(`stored ${rows.length} generation(s) for ${processed.length} model(s)`)
}

const span = (g: Generation): string => `${g.yearFrom}–${g.yearTo ?? 'now'}`

async function run(db: Db, args: Args): Promise<void> {
  const all = await loadTargets(db, args.only ? 400 : args.limit)
  const targets = args.only ? all.filter(t => norm(t.query) === norm(args.only!)) : all
  if (args.only && targets.length === 0)
    targets.push(
      ...[args.only].map(q => ({
        make: titleCase(q.split(' ')[0]!),
        model: q.split(' ').slice(1).join(' '),
        query: q,
        cars: 0
      }))
    )

  const rows: ModelGenerationInsert[] = []
  let hitCars = 0
  let totalCars = 0
  let hits = 0
  for (const t of targets) {
    totalCars += t.cars
    try {
      const { gens, target } = await resolve(t)
      if (gens.length > 0) {
        hits++
        hitCars += t.cars
        rows.push(...gens.map(g => toInsert(t, target, g)))
      }
      log(
        `${gens.length > 0 ? '✓' : '·'} ${t.query} (${t.cars.toLocaleString('en')} cars): ` +
          (gens.length > 0
            ? `${gens.length} gens [${gens[0]!.source}] ${gens.map(g => `${g.code || g.label} ${span(g)}`).join(', ')}`
            : 'none')
      )
    } catch (err) {
      log(`! ${t.query}: ${(err as Error).message}`)
    }
  }
  log(
    `\n${hits}/${targets.length} models have generations` +
      (totalCars > 0 ? `; they cover ${((100 * hitCars) / totalCars).toFixed(1)} % of the targets' cars` : '')
  )
  if (args.dryRun) return log('dry-run: nothing written')
  const processed = targets.map(t => ({
    makeKey: makeKey(t.make) ?? norm(t.make),
    modelKey: modelKey(t.model) ?? norm(t.model)
  }))
  await save(db, processed, rows)
}

const CSV_COLUMNS = [
  'make_key',
  'model_key',
  'make',
  'model',
  'year_from',
  'year_to',
  'code',
  'label',
  'body_styles',
  'platform',
  'wiki_title',
  'wikidata_id',
  'source'
] as const

async function exportToCsv(db: Db, path: string): Promise<void> {
  const rows = await db
    .select()
    .from(modelGenerations)
    .orderBy(modelGenerations.makeKey, modelGenerations.modelKey, modelGenerations.yearFrom)
  const csv = stringifyCsv(
    rows.map(r => ({
      make_key: r.makeKey,
      model_key: r.modelKey,
      make: r.make,
      model: r.model,
      year_from: r.yearFrom,
      year_to: r.yearTo ?? '',
      code: r.code,
      label: r.label,
      body_styles: r.bodyStyles,
      platform: r.platform,
      wiki_title: r.wikiTitle,
      wikidata_id: r.wikidataId,
      source: r.source
    })),
    { header: true, columns: [...CSV_COLUMNS] }
  )
  await mkdir(dirname(path), { recursive: true })
  const output = path.endsWith('.gz') ? gzipSync(csv) : csv
  await writeFile(path, output)
  log(`exported ${rows.length} generation(s) to ${path} (${(output.length / 1024).toFixed(0)} KB)`)
}

async function importFromCsv(db: Db, path: string): Promise<void> {
  const raw = await readFile(path)
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  const records = parseCsv(isGzip ? gunzipSync(raw).toString('utf8') : raw.toString('utf8'), {
    columns: true
  }) as Record<string, string>[]
  const rows: ModelGenerationInsert[] = records.map(r => ({
    makeKey: r.make_key!,
    modelKey: r.model_key!,
    make: r.make!,
    model: r.model!,
    yearFrom: Number(r.year_from),
    yearTo: r.year_to ? Number(r.year_to) : null,
    code: r.code ?? '',
    label: r.label!,
    bodyStyles: r.body_styles ?? '',
    platform: r.platform ?? '',
    wikiTitle: r.wiki_title ?? '',
    wikidataId: r.wikidata_id ?? '',
    source: r.source!
  }))
  // A seed is the whole table: replace it.
  await db.transaction(async tx => {
    await tx.execute(sql`TRUNCATE registry.model_generations`)
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx
        .insert(modelGenerations)
        .values(rows.slice(i, i + BATCH))
        .onConflictDoNothing()
    }
  })
  log(`loaded ${rows.length} generation(s) from ${path}`)
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
