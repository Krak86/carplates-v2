/**
 * PROBE (stage K) — how well do Wikipedia infoboxes fill spec fields, and does the per-field language fallback pay off?
 * Read-only: reads `registry.model_generations`, fetches infoboxes, prints a table. Writes nothing to the DB.
 *
 *   pnpm exec tsx src/wiki-specs-probe.ts                       # the default 15 models, newest 3 generations each
 *   pnpm exec tsx src/wiki-specs-probe.ts "toyota camry" "ford focus" --per 5 --show
 *
 * `--show` prints the parsed values of every article. Responses are cached in `scripts/.data/wikispecs-probe/`.
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

async function fetchPage(lang: string, title: string, withLinks: boolean): Promise<Page | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: withLinks ? 'revisions|langlinks' : 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    rvsection: '0',
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
      return s.engines.length > 0
  }
}

type Row = { model: string; title: string; byLang: Map<string, WikiSpecs> }

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

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const per = Number(argv[argv.indexOf('--per') + 1]) || 3
  const show = argv.includes('--show')
  const models = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--per')
  const targets = models.length > 0 ? models : DEFAULTS

  const { db, close } = createDb()
  const rows: Row[] = []
  try {
    for (const t of targets) {
      const [make, ...rest] = t.split(' ')
      const model = rest.join(' ')
      const { rows: gens } = (await db.execute(
        sql`SELECT code, label, year_from, wiki_title FROM registry.model_generations
            WHERE lower(make) = ${make!} AND lower(model) = ${model}
            ORDER BY year_from DESC LIMIT ${per}`
      )) as unknown as { rows: { code: string; label: string; year_from: number; wiki_title: string }[] }
      if (gens.length === 0) {
        console.log(`· ${t}: no generations in the table`)
        continue
      }
      for (const gen of gens) {
        const g = gen.wiki_title
        const en = await fetchPage('en', g, true)
        if (!en) continue
        const byLang = new Map<string, WikiSpecs>()
        byLang.set('en', parseWikiSpecs(en.revisions?.[0]?.slots.main.content ?? '', { lang: 'en', code: gen.code }))
        const wanted = ['ru', 'uk', ...(HOME_LANGS[make!] ?? [])]
        for (const lang of wanted) {
          const link = en.langlinks?.find(l => l.lang === lang)
          if (!link) continue
          const page = await fetchPage(lang, link.title, false)
          if (page)
            byLang.set(lang, parseWikiSpecs(page.revisions?.[0]?.slots.main.content ?? '', { lang, code: gen.code }))
        }
        rows.push({ model: t, title: g, byLang })
        const line = [...byLang.entries()]
          .map(
            ([lang, s]) =>
              `${lang}:${
                FIELDS.filter(f => filled(s, f))
                  .map(f => ABBR[f])
                  .join(',') || '-'
              }`
          )
          .join('  ')
        console.log(`${t} | ${g}\n    ${line}`)
        if (show) {
          const s = byLang.get('en')!
          console.log(
            `    ${JSON.stringify({ wb: s.wheelbaseMm?.value, l: s.lengthMm?.value, w: s.widthMm?.value, h: s.heightMm?.value, kg: s.kerbKg, tank: s.fuelTankL?.value, layout: s.layout, trn: s.transmission, raw: s.rawOnly })}`
          )
          for (const e of s.engines) console.log(`      eng ${JSON.stringify(e)}`)
        }
      }
    }
  } finally {
    await close()
  }

  // Per-field fill rate: en alone vs the best of the chain (en → ru → uk → home), i.e. what the fallback gains.
  console.log(`\n${rows.length} articles`)
  console.log('field            en     any-lang   gained by fallback')
  for (const f of FIELDS) {
    const en = rows.filter(r => filled(r.byLang.get('en')!, f)).length
    const any = rows.filter(r => [...r.byLang.values()].some(s => filled(s, f))).length
    const pct = (n: number): string => `${((100 * n) / Math.max(rows.length, 1)).toFixed(0)}%`.padStart(5)
    console.log(`${f.padEnd(16)} ${pct(en)}   ${pct(any)}      +${any - en}`)
  }
  const langs = new Set(rows.flatMap(r => [...r.byLang.keys()]))
  for (const lang of langs) {
    console.log(`edition ${lang}: ${rows.filter(r => r.byLang.has(lang)).length} articles exist`)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
