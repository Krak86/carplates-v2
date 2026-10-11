/**
 * PROBE (stage K) — how well do Wikipedia infoboxes + body tables fill spec fields, and does the per-field language fallback pay off?
 * Read-only: reads `registry.model_generations`, fetches full article wikitext, prints a table. Writes nothing to the DB.
 *
 *   pnpm exec tsx src/wiki-specs-probe.ts                       # the default 15 models, newest 3 generations each
 *   pnpm exec tsx src/wiki-specs-probe.ts "toyota camry" "ford focus" --per 5 --show
 *   pnpm exec tsx src/wiki-specs-probe.ts --extra               # + the "RDW has few rows" set (VAZ, ZAZ, Daewoo, Chery, bikes, buses)
 *   pnpm exec tsx src/wiki-specs-probe.ts --only-extra          # just that set
 *
 * `--show` prints the parsed values of every article. Responses are cached in `scripts/.data/wikispecs-probe/` (full-article
 * entries are keyed on the URL, so the earlier lead-only cache is not reused).
 *
 * The extra set has no `model_generations` rows (stage I covers the top models only): titles are given directly, so a
 * multi-generation article counts all its tables — its rates are an upper bound, flagged as such in the report.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDb } from '@carplates/db'
import { parseWikiSpecs, type WikiSpecs } from '@carplates/shared'
import { sql } from 'drizzle-orm'

const USER_AGENT = 'carsua.app-ingest/1.0 (https://carsua.app; rukrak86@gmail.com)'
const CACHE_DIR = new URL('../.data/wikispecs-probe/', import.meta.url)
const DELAY_MS = 250
const DEFAULTS = [
  'toyota camry',
  'volkswagen golf',
  'skoda octavia',
  'honda civic',
  'ford focus',
  'bmw 3 series',
  'renault megane',
  'nissan qashqai',
  'hyundai tucson',
  'opel astra',
  'mazda 6',
  'kia sportage',
  'mitsubishi lancer',
  'toyota corolla',
  'audi a6'
]

/** Makes/models the registry has plenty of but RDW covers badly (stage C: VAZ/Lada, ZAZ, Daewoo, Chery, Soviet, bikes, buses). */
const EXTRA: { group: string; titles: string[] }[] = [
  {
    group: 'VAZ/Lada',
    titles: [
      'VAZ-2101',
      'VAZ-2106',
      'VAZ-2107',
      'VAZ-2109',
      'Lada Niva',
      'Lada Priora',
      'Lada Kalina',
      'Lada Granta',
      'Lada Vesta'
    ]
  },
  {
    group: 'ZAZ/Daewoo',
    titles: ['ZAZ Tavria', 'ZAZ-965', 'ZAZ Sens', 'Daewoo Lanos', 'Daewoo Nexia', 'Daewoo Matiz']
  },
  { group: 'Chery/Geely', titles: ['Chery Tiggo 7', 'Chery QQ', 'Chery Amulet', 'Geely Emgrand EC7'] },
  { group: 'Soviet', titles: ['GAZ-24 Volga', 'GAZ-3110 Volga', 'UAZ-469', 'Moskvich-412', 'Moskvich-2141'] },
  {
    group: 'Motorcycles',
    titles: [
      'Yamaha YZF-R1',
      'Suzuki GSX-R750',
      'Honda CBR600F',
      'Honda CB500',
      'Kawasaki Ninja 250R',
      'Jawa 350',
      'Dnepr (motorcycle)'
    ]
  },
  { group: 'Buses', titles: ['LAZ-695', 'Ikarus 280', 'Bogdan A092', 'MAZ-103', 'PAZ-3205'] }
]

/** Home-market Wikipedia edition(s) per make (stage K plan: `HOME_WIKI_LANGS`). */
const HOME_LANGS: Record<string, string[]> = {
  toyota: ['ja'],
  honda: ['ja'],
  nissan: ['ja'],
  mazda: ['ja'],
  mitsubishi: ['ja'],
  subaru: ['ja'],
  suzuki: ['ja'],
  hyundai: ['ko'],
  kia: ['ko'],
  volkswagen: ['de'],
  bmw: ['de'],
  audi: ['de'],
  opel: ['de'],
  skoda: ['cs'],
  renault: ['fr'],
  peugeot: ['fr'],
  fiat: ['it']
}

const FIELDS = [
  'wheelbase',
  'length',
  'width',
  'height',
  'weight',
  'fuel_capacity',
  'layout',
  'transmission',
  'engine'
] as const
type Field = (typeof FIELDS)[number]

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

async function getJson<T>(url: string): Promise<T> {
  const file = fileURLToPath(new URL(`${createHash('sha1').update(url).digest('hex')}.json`, CACHE_DIR))
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    // not cached yet
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

type Page = {
  title: string
  missing?: boolean
  langlinks?: { lang: string; title: string }[]
  revisions?: { slots: { main: { content: string } } }[]
}

/** Full article wikitext: the body tables live far below the lead. */
async function fetchPage(lang: string, title: string, withLinks: boolean): Promise<Page | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: withLinks ? 'revisions|langlinks' : 'revisions',
    rvprop: 'content',
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

const filled = (s: WikiSpecs, f: Field): boolean => {
  switch (f) {
    case 'wheelbase':
      return !!s.wheelbaseMm
    case 'length':
      return !!s.lengthMm
    case 'width':
      return !!s.widthMm
    case 'height':
      return !!s.heightMm
    case 'weight':
      return !!s.kerbKg
    case 'fuel_capacity':
      return !!s.fuelTankL
    case 'layout':
      return !!s.layout
    case 'transmission':
      return !!s.transmission
    case 'engine':
      // An engine list is only useful with power (the stage K decision: "engines list with power").
      return s.engines.some(e => e.powerKw !== null)
  }
}

/** One edition of one article, parsed twice so the report can show what the tables add. */
type Parsed = { infobox: WikiSpecs; full: WikiSpecs }
type Row = { group: string; model: string; title: string; byLang: Map<string, Parsed> }

const ABBR: Record<Field, string> = {
  wheelbase: 'WB',
  length: 'L',
  width: 'W',
  height: 'H',
  weight: 'kg',
  fuel_capacity: 'tank',
  layout: 'lay',
  transmission: 'trn',
  engine: 'eng'
}

function parseBoth(page: Page, lang: string, code: string | undefined, series: boolean): Parsed {
  const text = page.revisions?.[0]?.slots.main.content ?? ''
  return {
    infobox: parseWikiSpecs(text, { lang, code, series, tables: false }),
    full: parseWikiSpecs(text, { lang, code, series })
  }
}

function describeRow(row: Row, show: boolean): void {
  const line = [...row.byLang.entries()]
    .map(
      ([lang, p]) =>
        `${lang}:${
          FIELDS.filter(f => filled(p.full, f))
            .map(f => ABBR[f])
            .join(',') || '-'
        }`
    )
    .join('  ')
  console.log(`${row.model} | ${row.title}\n    ${line}`)
  if (!show) return
  const s = row.byLang.get('en')?.full
  if (!s) return
  console.log(
    `    ${JSON.stringify({ wb: s.wheelbaseMm?.value, l: s.lengthMm?.value, w: s.widthMm?.value, h: s.heightMm?.value, kg: s.kerbKg?.value, tank: s.fuelTankL?.value, layout: s.layout, trn: s.transmission, raw: s.rawOnly })}`
  )
  for (const e of s.engines) console.log(`      eng ${JSON.stringify(e)}`)
}

const pct = (n: number, d: number): string => `${((100 * n) / Math.max(d, 1)).toFixed(0)}%`.padStart(5)

/** Per-field fill rate: en infobox only → en + tables → best of the chain, infobox only → best of the chain + tables. */
function report(name: string, rows: Row[]): void {
  if (rows.length === 0) return
  console.log(`\n== ${name}: ${rows.length} articles`)
  console.log('field             en infobox   en +tables   any lang infobox   any lang +tables')
  for (const f of FIELDS) {
    const en = rows.filter(r => r.byLang.has('en'))
    const enBox = en.filter(r => filled(r.byLang.get('en')!.infobox, f)).length
    const enFull = en.filter(r => filled(r.byLang.get('en')!.full, f)).length
    const anyBox = rows.filter(r => [...r.byLang.values()].some(p => filled(p.infobox, f))).length
    const anyFull = rows.filter(r => [...r.byLang.values()].some(p => filled(p.full, f))).length
    console.log(
      `${f.padEnd(16)} ${pct(enBox, rows.length)}        ${pct(enFull, rows.length)}        ${pct(anyBox, rows.length)}              ${pct(anyFull, rows.length)}`
    )
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const per = Number(argv[argv.indexOf('--per') + 1]) || 3
  const show = argv.includes('--show')
  const onlyExtra = argv.includes('--only-extra')
  const withExtra = onlyExtra || argv.includes('--extra')
  const models = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--per')
  const targets = onlyExtra ? [] : models.length > 0 ? models : DEFAULTS

  const { db, close } = createDb()
  const rows: Row[] = []
  try {
    for (const t of targets) {
      const [make, ...rest] = t.split(' ')
      const model = rest.join(' ')
      const { rows: gens } = (await db.execute(
        sql`SELECT code, label, year_from, wiki_title, source FROM registry.model_generations
            WHERE lower(make) = ${make!} AND lower(model) = ${model}
            ORDER BY year_from DESC LIMIT ${per}`
      )) as unknown as {
        rows: { code: string; label: string; year_from: number; wiki_title: string; source: string }[]
      }
      if (gens.length === 0) {
        console.log(`· ${t}: no generations in the table`)
        continue
      }
      for (const gen of gens) {
        const en = await fetchPage('en', gen.wiki_title, true)
        if (!en) continue
        // `headings` generations share one series article: tables only count under the heading that names the code.
        const series = gen.source === 'headings'
        const byLang = new Map<string, Parsed>()
        const code = gen.code || gen.label // no code (Lancer): the heading is "Tenth generation (…)"
        byLang.set('en', parseBoth(en, 'en', code, series))
        for (const lang of ['ru', 'uk', ...(HOME_LANGS[make!] ?? [])]) {
          const link = en.langlinks?.find(l => l.lang === lang)
          const page = link ? await fetchPage(lang, link.title, false) : null
          if (page) byLang.set(lang, parseBoth(page, lang, code, series))
        }
        const row: Row = { group: 'registry top models (stage I)', model: t, title: gen.wiki_title, byLang }
        rows.push(row)
        describeRow(row, show)
      }
    }
  } finally {
    await close()
  }

  if (withExtra) {
    for (const { group, titles } of EXTRA) {
      for (const title of titles) {
        const en = await fetchPage('en', title, true)
        if (!en) {
          console.log(`· ${title}: no en article`)
          continue
        }
        const byLang = new Map<string, Parsed>()
        byLang.set('en', parseBoth(en, 'en', undefined, false))
        for (const lang of ['ru', 'uk', 'de']) {
          const link = en.langlinks?.find(l => l.lang === lang)
          const page = link ? await fetchPage(lang, link.title, false) : null
          if (page) byLang.set(lang, parseBoth(page, lang, undefined, false))
        }
        const row: Row = { group, model: group, title, byLang }
        rows.push(row)
        describeRow(row, show)
      }
    }
  }

  const groups = [...new Set(rows.map(r => r.group))]
  report('ALL', rows)
  if (groups.length > 1)
    for (const g of groups)
      report(
        g,
        rows.filter(r => r.group === g)
      )
  const langs = new Set(rows.flatMap(r => [...r.byLang.keys()]))
  for (const lang of langs) {
    console.log(`edition ${lang}: ${rows.filter(r => r.byLang.has(lang)).length} articles exist`)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
