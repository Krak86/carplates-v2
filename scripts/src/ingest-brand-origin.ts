/**
 * Loads brand origin (country, founded year, HQ city) and ownership history from Wikidata (CC0) into `registry.brand_origin_period`
 * and `registry.brand_ownership`, keyed on our brand slug (`brandSlug()`), plus the unmatched-brand report.
 *
 * Matching: every Wikidata car / truck / bus / motorcycle maker is slugified (`labelToSlug`) and compared with the slugs the registry
 * brands resolve to. Exact label first, then with a company suffix dropped ("Skoda Auto" -> "skoda"). Spellings that differ go into
 * `WIKIDATA_ALIASES`, legacy-country gaps and missing brands into `ORIGIN_OVERRIDES` (`brand-origin-overrides.ts`).
 *
 * Raw responses are cached in scripts/.data/brand-origin/ (gitignored), so a re-run only re-queries with --refresh.
 *
 *   pnpm ingest:brand-origin                # query (cached), upsert, print the unmatched-brand report
 *   pnpm ingest:brand-origin --report       # report only: nothing written to the DB
 *   pnpm ingest:brand-origin --dry-run      # as --report, plus what would be written
 *   pnpm ingest:brand-origin --refresh      # ignore the cache
 *   pnpm ingest:brand-origin --top 80       # unmatched rows to print (default 60)
 *   pnpm ingest:brand-origin --show skoda,volvo   # print the rows built for these slugs
 *   pnpm ingest:brand-origin --export-csv seed-data/brand-origin.csv.gz   # dump both tables (+ brand-ownership.csv.gz beside it)
 *   pnpm ingest:brand-origin --from-csv seed-data/brand-origin.csv.gz     # load that dump (replaces both tables), no Wikidata calls
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createDb, brandOriginPeriod, brandOwnership } from '@carplates/db'
import type { Db } from '@carplates/db'
import { brandSlug } from '@carplates/shared'
import { inArray, sql } from 'drizzle-orm'

import { ORIGIN_OVERRIDES, OWNERSHIP_OVERRIDES, WIKIDATA_ALIASES } from './brand-origin-overrides.js'
import {
  BRAND_CLASSES,
  entitiesSchema,
  foldItemRows,
  ownerIdsOf,
  ownerRows,
  matchSlugs,
  mergeBrand,
  qid,
  sparqlResponseSchema
} from './brand-origin-parse.js'
import type { BrandOriginRow, Entities, BrandOwnershipRowOut, SparqlRow, WikidataItem } from './brand-origin-parse.js'
import { exportBrandOrigin, importBrandOrigin } from './origin-csv.js'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'carsua.app-ingest/1.0 (+https://carsua.app; rukrak86@gmail.com)'
const DATA_DIR = join(import.meta.dirname, '..', '.data', 'brand-origin')
const BATCH = 25
const PAUSE_MS = 1500
const RETRIES = 2
const QUERY_TIMEOUT_MS = 90_000

type Args = {
  report: boolean
  dryRun: boolean
  refresh: boolean
  top: number
  show: string[]
  exportCsv?: string
  fromCsv?: string
}

function parseArgs(argv: string[]): Args {
  const a: Args = { report: false, dryRun: false, refresh: false, top: 60, show: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--report') a.report = true
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--refresh') a.refresh = true
    else if (arg === '--show') a.show = (argv[++i] ?? '').split(',').filter(Boolean)
    else if (arg === '--top') a.top = Number(argv[++i]) || a.top
    else if (arg === '--export-csv') a.exportCsv = argv[++i]
    else if (arg === '--from-csv') a.fromCsv = argv[++i]
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

async function sparql(query: string): Promise<SparqlRow[]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT
        },
        body: new URLSearchParams({ query }),
        signal: AbortSignal.timeout(QUERY_TIMEOUT_MS)
      })
      if (res.ok) return sparqlResponseSchema.parse(await res.json()).results.bindings
      lastError = new Error(`Wikidata ${res.status}: ${(await res.text()).slice(0, 200)}`)
      if (res.status === 429) await sleep(Number(res.headers.get('retry-after') ?? 10) * 1000)
      else if (res.status >= 400 && res.status < 500) throw lastError
    } catch (err) {
      lastError = err
      if (err instanceof Error && /^Wikidata 4(?!29)/.test(err.message)) throw err
    }
    await sleep(attempt * 5000)
  }
  throw lastError
}

async function cached<T>(name: string, refresh: boolean, load: () => Promise<T>): Promise<T> {
  const path = join(DATA_DIR, `${name}.json`)
  if (!refresh && existsSync(path)) return JSON.parse(await readFile(path, 'utf8')) as T
  const value = await load()
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(value))
  await sleep(PAUSE_MS)
  return value
}

const LABEL_LANGS = ['en', 'uk', 'ru']

const candidatesQuery = (): string => `
SELECT DISTINCT ?item ?label WHERE {
  VALUES ?cls { ${BRAND_CLASSES.map(c => `wd:${c}`).join(' ')} }
  ?item wdt:P31 ?cls .
  { ?item rdfs:label ?label } UNION { ?item skos:altLabel ?label }
  FILTER(lang(?label) IN (${LABEL_LANGS.map(l => `"${l}"`).join(', ')}))
}`

const factsQuery = (ids: readonly string[]): string => `
SELECT ?item ?cc ?ccHome ?inception ?hq WHERE {
  VALUES ?item { ${ids.map(id => `wd:${id}`).join(' ')} }
  OPTIONAL { ?item wdt:P495 ?o495 . ?o495 wdt:P297 ?cc }
  OPTIONAL { ?item wdt:P17 ?o17 . ?o17 wdt:P297 ?ccHome }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P159 ?h . ?h rdfs:label ?hq . FILTER(lang(?hq) = "en") }
}`

/** A batch Wikidata times out on is halved until the heavy item stands alone (then it is skipped with a warning). */
async function fetchPart(
  kind: string,
  build: (ids: readonly string[]) => string,
  ids: readonly string[],
  refresh: boolean
): Promise<SparqlRow[]> {
  const key = `${kind}-${createHash('sha1').update(ids.join()).digest('hex').slice(0, 12)}`
  try {
    return await cached(key, refresh, () => sparql(build(ids)))
  } catch (err) {
    if (ids.length === 1) {
      log(`  skipped ${kind} of ${ids[0]}: ${err instanceof Error ? err.message.slice(0, 60) : String(err)}`)
      return []
    }
    const half = Math.ceil(ids.length / 2)
    return [
      ...(await fetchPart(kind, build, ids.slice(0, half), refresh)),
      ...(await fetchPart(kind, build, ids.slice(half), refresh))
    ]
  }
}

const API = 'https://www.wikidata.org/w/api.php'

/** Entity API (cheap, unlike SPARQL on big brands): `ids` up to 50 per call. */
async function entities(ids: readonly string[], props: 'claims' | 'labels'): Promise<Entities> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props,
    languages: 'en',
    format: 'json'
  })
  for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
    const res = await fetch(`${API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS)
    })
    if (res.ok) {
      const body = (await res.json()) as unknown
      const parsed = entitiesSchema.safeParse(body)
      if (parsed.success) return parsed.data.entities
    }
    await sleep(attempt * 5000)
  }
  throw new Error(`Wikidata entity API failed for ${ids[0]}...`)
}

async function fetchOwners(ids: readonly string[], refresh: boolean): Promise<SparqlRow[]> {
  const rows: SparqlRow[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const claims = await cached(`claims-${chunk[0]}-${chunk.length}`, refresh, () => entities(chunk, 'claims'))
    const ownerIds = ownerIdsOf(claims)
    const labels = new Map<string, string>()
    for (let j = 0; j < ownerIds.length; j += 50) {
      const part = ownerIds.slice(j, j + 50)
      const got = await cached(`labels-${part[0]}-${part.length}`, refresh, () => entities(part, 'labels'))
      for (const [id, e] of Object.entries(got)) if (e.labels?.en) labels.set(id, e.labels.en.value)
    }
    rows.push(...ownerRows(claims, labels))
  }
  return rows
}

/** Registry brands with their distinct-plate counts, grouped by slug; brands without a slug are returned apart. */
async function registryBrands(db: Db): Promise<{ bySlug: Map<string, number>; unmapped: Map<string, number> }> {
  const { rows } = await db.execute<{ brand: string | null; n: string }>(
    sql`SELECT brand, sum(distinct_plates)::bigint AS n FROM registry.stats_by_brand GROUP BY brand`
  )
  const bySlug = new Map<string, number>()
  const unmapped = new Map<string, number>()
  for (const r of rows) {
    const n = Number(r.n)
    const slug = brandSlug(r.brand)
    if (slug) bySlug.set(slug, (bySlug.get(slug) ?? 0) + n)
    else {
      const name =
        (r.brand ?? '')
          .trim()
          .split(/\s{2,}/)[0]
          ?.toUpperCase() ?? ''
      if (name) unmapped.set(name, (unmapped.get(name) ?? 0) + n)
    }
  }
  return { bySlug, unmapped }
}

function printReport(
  total: number,
  bySlug: ReadonlyMap<string, number>,
  matched: ReadonlySet<string>,
  unmapped: ReadonlyMap<string, number>,
  top: number
): void {
  const covered = [...bySlug].filter(([s]) => matched.has(s)).reduce((a, [, n]) => a + n, 0)
  const pct = (n: number): string => `${((n / total) * 100).toFixed(2)}%`
  log(`\nregistry vehicles with a known brand slug: ${total}`)
  log(`  with origin data: ${covered} (${pct(covered)})`)
  const missing = [...bySlug].filter(([s]) => !matched.has(s)).sort((a, b) => b[1] - a[1])
  const missingSum = missing.reduce((a, [, n]) => a + n, 0)
  log(`  slugs WITHOUT origin data: ${missing.length} (${missingSum} vehicles, ${pct(missingSum)})`)
  for (const [slug, n] of missing.slice(0, top)) log(`    ${slug.padEnd(24)} ${String(n).padStart(10)}  ${pct(n)}`)

  const unmappedSum = [...unmapped.values()].reduce((a, n) => a + n, 0)
  log(`\nbrand names with NO slug in brandLogo.ts: ${unmapped.size} (${unmappedSum} vehicles)`)
  const unmappedTop = [...unmapped].sort((a, b) => b[1] - a[1]).slice(0, top)
  for (const [name, n] of unmappedTop) log(`    ${name.padEnd(28)} ${String(n).padStart(10)}`)
}

async function save(db: Db, origin: BrandOriginRow[], owners: BrandOwnershipRowOut[]): Promise<void> {
  const slugs = [...new Set(origin.map(r => r.brandSlug))]
  await db.transaction(async tx => {
    if (slugs.length) {
      await tx.delete(brandOriginPeriod).where(inArray(brandOriginPeriod.brandSlug, slugs))
      await tx.delete(brandOwnership).where(inArray(brandOwnership.brandSlug, slugs))
    }
    for (let i = 0; i < origin.length; i += 500) {
      await tx
        .insert(brandOriginPeriod)
        .values(origin.slice(i, i + 500))
        .onConflictDoNothing()
    }
    for (let i = 0; i < owners.length; i += 500) {
      await tx
        .insert(brandOwnership)
        .values(owners.slice(i, i + 500))
        .onConflictDoNothing()
    }
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { db, close } = createDb()
  try {
    if (args.exportCsv) return await exportBrandOrigin(db, args.exportCsv)
    if (args.fromCsv) return await importBrandOrigin(db, args.fromCsv)

    const { bySlug, unmapped } = await registryBrands(db)
    const total = [...bySlug.values()].reduce((a, n) => a + n, 0)
    const slugs = new Set(bySlug.keys())
    log(`registry: ${slugs.size} brand slug(s)`)

    const candidateRows = await cached('candidates', args.refresh, () => sparql(candidatesQuery()))
    const labelsById = new Map<string, Set<string>>()
    for (const r of candidateRows) {
      const id = qid(r.item?.value ?? '')
      if (!id || !r.label) continue
      const set = labelsById.get(id) ?? new Set<string>()
      set.add(r.label.value)
      labelsById.set(id, set)
    }
    const items: WikidataItem[] = [...labelsById].map(([id, labels]) => ({ id, labels: [...labels] }))
    log(`wikidata: ${items.length} candidate item(s)`)

    const { exact, loose } = matchSlugs(items, slugs, WIKIDATA_ALIASES)
    const wanted = [...new Set([...exact.values(), ...loose.values()].flat())].sort(
      (a, b) => Number(a.slice(1)) - Number(b.slice(1))
    )
    log(`matched ${new Set([...exact.keys(), ...loose.keys()]).size} slug(s) -> ${wanted.length} item(s) to fetch`)

    const detailRows: SparqlRow[] = []
    for (let i = 0; i < wanted.length; i += BATCH) {
      const ids = wanted.slice(i, i + BATCH)
      detailRows.push(...(await fetchPart('facts', factsQuery, ids, args.refresh)))
    }
    detailRows.push(...(await fetchOwners(wanted, args.refresh)))
    const facts = foldItemRows(detailRows)

    const origin: BrandOriginRow[] = []
    const owners: BrandOwnershipRowOut[] = []
    const matchedSlugs = new Set<string>()
    for (const slug of new Set([...exact.keys(), ...loose.keys()])) {
      const merged = mergeBrand(slug, exact.get(slug) ?? [], loose.get(slug) ?? [], facts)
      if (merged.origin) origin.push(merged.origin)
      owners.push(...merged.owners)
    }
    for (const [slug, periods] of Object.entries(ORIGIN_OVERRIDES)) {
      for (let i = origin.length - 1; i >= 0; i--) if (origin[i]!.brandSlug === slug) origin.splice(i, 1)
      origin.push(...periods.map(p => ({ ...p, brandSlug: slug })))
    }
    for (const [slug, rows] of Object.entries(OWNERSHIP_OVERRIDES)) {
      for (let i = owners.length - 1; i >= 0; i--) if (owners[i]!.brandSlug === slug) owners.splice(i, 1)
      owners.push(...rows.map(r => ({ ...r, brandSlug: slug })))
    }
    for (const r of origin) matchedSlugs.add(r.brandSlug)

    log(
      `result: ${origin.length} origin period(s) for ${matchedSlugs.size} brand(s), ${owners.length} ownership row(s)`
    )
    for (const slug of args.show) {
      log(`
[${slug}]`)
      for (const r of origin.filter(o => o.brandSlug === slug)) log('  origin ', JSON.stringify(r))
      for (const r of owners.filter(o => o.brandSlug === slug)) log('  owner  ', JSON.stringify(r))
    }
    printReport(total, bySlug, matchedSlugs, unmapped, args.top)

    if (args.report) return
    if (args.dryRun) {
      log('\ndry-run: nothing written')
      return
    }
    await save(db, origin, owners)
    log('\nwritten to registry.brand_origin_period / registry.brand_ownership')
  } finally {
    await close()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
