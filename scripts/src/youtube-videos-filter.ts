/** Pure helpers of the YouTube fallback (`youtube-videos.ts`): model keys, search aliases, title filter, language. */

export type VideoLang = 'ua' | 'ru' | 'en'

export const MIN_DURATION_S = 150
/** Videos kept per model, and the cap for the lowest-priority language. */
export const MAX_KEPT = 8
export const MAX_EN = 3

/** Dealer/used-car listings, not reviews. */
const DEALER_WORDS =
  /автопідбір|автоподбор|авторинок|авторынок|під замовлення|под заказ|пригін|пригон|з німеччини|из германии|продам|продаж|продаю|купити|купить|ціни|цены|ціна|цена\b|в наявності|в наличии/i

/** Hand-curated Cyrillic spellings titles actually use, keyed by `brand_slug/model_slug`. The Latin model is implicit. */
export const CYRILLIC_ALIASES: Readonly<Record<string, string[]>> = {
  'volkswagen/touran': ['туран'],
  'volkswagen/bora': ['бора'],
  'volkswagen/caddy': ['кадді', 'кадди'],
  'ford/fusion': ['фьюжн', 'фьюжен'],
  'ford/c-max': ['с-макс', 'си макс', 'c max'],
  'mitsubishi/lancer': ['лансер'],
  'mitsubishi/colt': ['кольт'],
  'fiat/doblo': ['doblò', 'добло'],
  'fiat/scudo': ['скудо'],
  'fiat/ducato': ['дукато'],
  'renault/laguna': ['лагуна'],
  'opel/omega': ['омега'],
  'opel/meriva': ['мерива'],
  'opel/movano': ['мовано'],
  'daewoo/lanos': ['ланос'],
  'daewoo/sens': ['сенс'],
  'daewoo/nexia': ['нексія', 'нексия'],
  'hyundai/getz': ['гетц'],
  'hyundai/ix35': ['их35', 'их 35', 'ix 35'],
  'nissan/note': ['ниссан ноут', 'ніссан ноут', 'ниссан нот'],
  'nissan/primera': ['примера'],
  'nissan/tiida': ['тиида', 'тііда'],
  'peugeot/307': ['пежо 307'],
  'peugeot/207': ['пежо 207'],
  'peugeot/expert': ['експерт', 'эксперт'],
  'mercedes/vito': ['вито', 'віто'],
  'chevrolet/niva': ['нива'],
  'chevrolet/nubira': ['нубира', 'нубіра'],
  'mazda/cx-7': ['сх-7', 'сх7', 'cx7'],
  'vaz/2101': ['копейк', 'копійк', 'жигули'],
  'vaz/2106': ['шестерк', 'шістк'],
  'vaz/2108': ['восьмерк', 'восьмёрк'],
  'vaz/2110': ['десятк'],
  'vaz/2170': ['приора', 'priora'],
  'vaz/2105': ['пятерк', 'п’ятірк', 'пятёрк'],
  'vaz/2107': ['семерк', 'семёрк', 'сімерк'],
  'vaz/2109': ['девятк', 'дев’ятк', 'девятка'],
  'vaz/21099': ['девяносто девят', 'зубило', 'спутник'],
  'zaz/110307': ['таврия', 'таврія'],
  'zaz/1102': ['таврия', 'таврія']
}

const brandKey = (brandSlug: string, modelSlug: string): string => `${brandSlug}/${modelSlug}`

/** A registry model with its doubled spelling collapsed: `LANOS LANOS` -> `LANOS`, `NOTE NOTE` -> `NOTE`. */
export function collapseModel(model: string): string {
  const words = model.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2
    const [a, b] = [words.slice(0, half).join(' '), words.slice(half).join(' ')]
    if (a.toLowerCase() === b.toLowerCase()) return a
  }
  return words.join(' ')
}

/**
 * ВАЗ factory trim codes name the model people actually search for: 21063 -> 2106, 210700-20 -> 2107, 211540 -> 2115,
 * 217030 -> 2170 (Priora). 21099 and its 210994 are the one real model name of that length and stay 21099.
 * Other brands and non-numeric models are returned as they are.
 */
export function baseModel(brandSlug: string, model: string): string {
  if (brandSlug !== 'vaz') return model
  const code = /^\d+/.exec(model.trim())?.[0]
  if (!code || code.length < 5) return model
  return code.startsWith('21099') ? '21099' : code.slice(0, 4)
}

/** Lower-case words that mean something outside cars — they need the brand in the title to count as a mention. */
const COMMON_WORDS = new Set(['note', 'fusion', 'omega', 'sens', 'colt', 'expert', 'niva', 'bora', 'vito', 'ducato'])

/**
 * Lower-case strings, any of which in a title means "this video is about the model". Short or common-word models need
 * the brand next to them, so "Nissan Note" matches but a bare "note" doesn't.
 */
export function aliasesFor(brandSlug: string, modelSlug: string, brand: string, model: string): string[] {
  const latin = model.trim().toLowerCase()
  const cyr = CYRILLIC_ALIASES[brandKey(brandSlug, modelSlug)] ?? []
  const needsBrand = COMMON_WORDS.has(latin) || latin.length <= 3
  const base = needsBrand ? [`${brand.trim().toLowerCase()} ${latin}`] : [latin]
  // Cyrillic spellings already include the brand when they must (see the table); they are specific enough otherwise.
  return [...base, ...cyr.map(a => a.toLowerCase())]
}

/** ISO-8601 duration (`PT1H2M3S`) in seconds; 0 when unparseable. */
export function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso)
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0
}

/** ua / ru / en from the title's script — the API's language fields are mostly empty. Ambiguous Cyrillic counts as ru. */
export function titleLang(title: string): VideoLang {
  if (/[іїєґІЇЄҐ]/.test(title)) return 'ua'
  return /[а-яА-ЯёЁ]/.test(title) ? 'ru' : 'en'
}

/** A model year named in the title (`2008`, not a date or a bigger number), or null. */
export function titleYear(title: string): number | null {
  const m = /(?<!\d)(19[5-9]\d|20[0-3]\d)(?!\d)/.exec(title.replace(/\d{4}-\d{2}-\d{2}/g, ' '))
  return m ? Number(m[1]) : null
}

export type Candidate = {
  title: string
  durationS: number
  embeddable: boolean
}

export type Rejection = 'not embeddable' | 'no model in title' | 'dealer' | 'short'

/** Why a video is dropped, or null when it is kept. */
export function rejection(c: Candidate, aliases: string[]): Rejection | null {
  if (!c.embeddable) return 'not embeddable'
  const lower = c.title.toLowerCase()
  if (!aliases.some(a => lower.includes(a))) return 'no model in title'
  if (DEALER_WORDS.test(c.title)) return 'dealer'
  if (c.durationS < MIN_DURATION_S) return 'short'
  return null
}

/** Best `MAX_KEPT` by views with at most `MAX_EN` English ones (the lowest-priority language). */
export function pickTop<T extends { lang: VideoLang; views: number }>(videos: T[]): T[] {
  const sorted = [...videos].sort((a, b) => b.views - a.views)
  const out: T[] = []
  let en = 0
  for (const v of sorted) {
    if (out.length >= MAX_KEPT) break
    if (v.lang === 'en' && en >= MAX_EN) continue
    if (v.lang === 'en') en++
    out.push(v)
  }
  return out
}

/** The search cascade: ua first, then ru, then en, each with the brand/model as the registry spells them. */
export function searchQueries(brand: string, model: string): string[] {
  const name = `${brand} ${model}`.replace(/\s+/g, ' ').trim()
  return [`${name} огляд тест-драйв`, `${name} обзор тест-драйв`, `${name} review`]
}

/** Start of the current Pacific day — the YouTube Data API's quota resets at midnight Pacific. */
export function pacificDayStart(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }).formatToParts(now)
  const n = (type: string): number => Number(parts.find(p => p.type === type)?.value ?? 0)
  return new Date(now.getTime() - ((n('hour') * 60 + n('minute')) * 60 + n('second')) * 1000)
}
