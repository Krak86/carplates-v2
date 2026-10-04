/**
 * Trial of the YouTube fallback for models infocar.ua has no video for (PLAN.md "Car reviews" Step 2a): searches the
 * YouTube Data API per (brand, model) in ua/ru/en, filters by title, and prints what it would keep. Dry-run only —
 * nothing is written to the DB yet. Needs `GOOGLE_API_KEY` (run with `--env-file`, see below).
 *
 *   pnpm --filter @carplates/scripts exec tsx --env-file=../apps/api/.env src/youtube-videos.ts
 *
 * Quota: every `search.list` costs 100 units of the 10,000/day default, `videos.list` 1 unit per call (50 ids).
 */
import { z } from 'zod'

type Target = { brand: string; model: string; aliases: string[] }

/** Trial set: gap models from PLAN.md, with the Cyrillic spellings titles actually use. */
const TARGETS: Target[] = [
  { brand: 'Volkswagen', model: 'Touran', aliases: ['touran', 'туран'] },
  { brand: 'Ford', model: 'Fusion', aliases: ['fusion', 'фьюжн', 'фьюжен'] },
  { brand: 'Mitsubishi', model: 'Lancer', aliases: ['lancer', 'лансер'] },
  { brand: 'Fiat', model: 'Doblo', aliases: ['doblo', 'doblò', 'добло'] },
  { brand: 'Renault', model: 'Laguna', aliases: ['laguna', 'лагуна'] },
  { brand: 'Opel', model: 'Omega', aliases: ['omega', 'омега'] },
  { brand: 'Daewoo', model: 'Lanos', aliases: ['lanos', 'ланос'] },
  { brand: 'ВАЗ', model: '2107', aliases: ['2107', 'семерк', 'семёрк'] },
  { brand: 'Hyundai', model: 'Getz', aliases: ['getz', 'гетц'] },
  { brand: 'Nissan', model: 'Note', aliases: ['nissan note', 'ниссан ноут', 'ніссан ноут', 'ниссан нот'] }
]

const QUERIES = (t: Target) => [
  `${t.brand} ${t.model} огляд тест-драйв`,
  `${t.brand} ${t.model} обзор тест-драйв`,
  `${t.brand} ${t.model} review`
]

/** Dealer/used-car listings, not reviews. */
const DEALER_WORDS = /автопідбір|автоподбор|авторинок|авторынок|під замовлення|под заказ|пригін|пригон|з німеччини|из германии|продам|продаж|продаю|купити|купить|ціни|цены|ціна|цена\b|в наявності|в наличии/i

const MIN_DURATION_S = 150

const SearchSchema = z.object({
  items: z.array(z.object({ id: z.object({ videoId: z.string() }) })).default([])
})
const VideosSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({ title: z.string(), channelTitle: z.string(), publishedAt: z.string() }),
      contentDetails: z.object({ duration: z.string() }),
      status: z.object({ embeddable: z.boolean() }),
      statistics: z.object({ viewCount: z.string().optional() })
    })
  )
})

const apiKey = process.env.GOOGLE_API_KEY
if (!apiKey) throw new Error('GOOGLE_API_KEY is not set (run with --env-file=../apps/api/.env)')

let units = 0

async function api(path: string, params: Record<string, string>, cost: number): Promise<unknown> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  url.search = new URLSearchParams({ ...params, key: apiKey ?? '' }).toString()
  const res = await fetch(url)
  const body: unknown = await res.json()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body).slice(0, 300)}`)
  units += cost
  return body
}

function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0
}

/** ua / ru / en from the title's script — the API's language fields are mostly empty. */
function titleLang(title: string): 'ua' | 'ru' | 'en' | 'cyr' {
  if (/[іїєґІЇЄҐ]/.test(title)) return 'ua'
  if (/[ыэёъЫЭЁЪ]/.test(title)) return 'ru'
  return /[а-яА-Я]/.test(title) ? 'cyr' : 'en'
}

type Kept = { id: string; title: string; channel: string; views: number; durationS: number; lang: string }

/** Cascade: stop at the first query (ua, then ru, then en) after which this many videos survive the filter. */
const ENOUGH = 3

async function runTarget(t: Target): Promise<void> {
  const ids = new Set<string>()
  const kept: Kept[] = []
  const rejected: Record<string, string[]> = { 'no model in title': [], dealer: [], short: [], 'not embeddable': [] }
  const start = units
  let usedQueries = 0
  for (const q of QUERIES(t)) {
    usedQueries++
    const raw = SearchSchema.parse(
      await api('search', { part: 'id', q, type: 'video', maxResults: '50', videoEmbeddable: 'true' }, 100)
    )
    const fresh = raw.items.map(i => i.id.videoId).filter(id => !ids.has(id))
    for (const id of fresh) ids.add(id)
    if (fresh.length) filterInto(t, kept, rejected, await fetchDetails(fresh))
    if (kept.length >= ENOUGH) break
  }
  kept.sort((a, b) => b.views - a.views)

  console.log(`\n=== ${t.brand} ${t.model}: ${ids.size} found, ${kept.length} kept, ${usedQueries} quer${usedQueries === 1 ? 'y' : 'ies'}, ${units - start} units ===`)
  for (const k of kept.slice(0, 6))
    console.log(`  KEEP [${k.lang}] ${k.views}v ${Math.round(k.durationS / 60)}m ${k.id} | ${k.channel} | ${k.title}`)
  for (const [why, titles] of Object.entries(rejected))
    if (titles.length) console.log(`  drop ${why} (${titles.length}): ${titles.slice(0, 3).join(' || ')}`)
}

async function fetchDetails(ids: string[]): Promise<z.infer<typeof VideosSchema>> {
  const out: z.infer<typeof VideosSchema> = { items: [] }
  for (let i = 0; i < ids.length; i += 50)
    out.items.push(
      ...VideosSchema.parse(
        await api('videos', { part: 'snippet,contentDetails,status,statistics', id: ids.slice(i, i + 50).join(',') }, 1)
      ).items
    )
  return out
}

function filterInto(
  t: Target,
  kept: Kept[],
  rejected: Record<string, string[]>,
  details: z.infer<typeof VideosSchema>
): void {
  for (const v of details.items) {
    const title = v.snippet.title
    const lower = title.toLowerCase()
    const durationS = parseIsoDuration(v.contentDetails.duration)
    if (!v.status.embeddable) rejected['not embeddable']?.push(title)
    else if (!t.aliases.some(a => lower.includes(a))) rejected['no model in title']?.push(title)
    else if (DEALER_WORDS.test(title)) rejected.dealer?.push(title)
    else if (durationS < MIN_DURATION_S) rejected.short?.push(title)
    else
      kept.push({
        id: v.id,
        title,
        channel: v.snippet.channelTitle,
        views: Number(v.statistics.viewCount ?? 0),
        durationS,
        lang: titleLang(title)
      })
  }
}

const only = process.argv.slice(2).filter(a => !a.startsWith('-'))
for (const t of TARGETS.filter(x => !only.length || only.includes(x.model.toLowerCase())))
  await runTarget(t)
console.log(`\nquota used this run: ${units} units`)
