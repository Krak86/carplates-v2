/**
 * 3DTuning "Customize in 3D" link matching (docs/tuning-3d-plan.md). Pure: the ingest script, the match-rate report and the API
 * all use these helpers, so a link is only ever shown when this file says the match is confident ("no match" = no link).
 *
 * A 3DTuning page is `/<locale>/tuning/<make>/<model>/<body>[-<generation>].<startYear>`, one page per body and generation, with
 * the generation's START year only. Matching: make + model by a punctuation-free key, then the generation with the largest
 * `startYear <= car year` (capped by `MAX_GENERATION_GAP_YEARS`, since the end year is unknown).
 */

import { z } from 'zod'

export type Tuning3dPage = {
  makeSlug: string
  modelSlug: string
  body: string
  generation: string
  startYear: number
  /** Path without the locale: `tuning/bmw/3.series/sedan-e90.2005`. */
  path: string
}

/** Locales their site has; there is no uk-UA, so ua users get ru-RU. */
export const TUNING_3D_LOCALES = ['en-US', 'ru-RU'] as const
export type Tuning3dLocale = (typeof TUNING_3D_LOCALES)[number]
export const DEFAULT_TUNING_3D_LOCALE: Tuning3dLocale = 'en-US'

export const TUNING_3D_ORIGIN = 'https://www.3dtuning.com'

/** A generation lasts ~5-12 years; a gap beyond this means the car's own generation is not on their site. */
export const MAX_GENERATION_GAP_YEARS = 12

const MIN_YEAR = 1880
const MAX_YEAR = 2100

/** Punctuation-free comparison key: `3.series` / `3-series` / `3 Series` -> `3series`. */
export const tuningKey = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Our make key -> their make key, only where the squashed names differ. */
const MAKE_ALIASES: Readonly<Record<string, string>> = {
  mercedesbenz: 'mercedes',
  vaz: 'lada'
}

/** `<makeKey>/<modelKey>` (ours) -> extra model keys on their side. Grown from the match-rate report; keep it small and certain. */
const MODEL_ALIASES: Readonly<Record<string, readonly string[]>> = {}

/** `/en-US/tuning/bmw/3.series/sedan-e90.2005` (or a full URL) -> a page, or null when it is not a car page. */
export function parseTuningPage(pathOrUrl: string): Tuning3dPage | null {
  const pathname = /^https?:\/\//.test(pathOrUrl) ? new URL(pathOrUrl).pathname : pathOrUrl
  const m = /^\/[a-z]{2}-[A-Za-z]{2}\/(tuning\/([^/]+)\/([^/]+)\/([^/]+))$/.exec(pathname)
  if (!m) return null
  const [, path, makeSlug, modelSlug, last] = m as unknown as [string, string, string, string, string]
  const y = /^(.+)\.(\d{4})$/.exec(last)
  if (!y) return null
  const startYear = Number(y[2])
  if (startYear < MIN_YEAR || startYear > MAX_YEAR) return null
  const rest = y[1]!
  const dash = rest.indexOf('-')
  return {
    makeSlug,
    modelSlug,
    body: dash < 0 ? rest : rest.slice(0, dash),
    generation: dash < 0 ? '' : rest.slice(dash + 1),
    startYear,
    path
  }
}

/** Full link to a page; `locale` defaults to en-US. */
export const tuningUrl = (
  page: Pick<Tuning3dPage, 'path'>,
  locale: Tuning3dLocale = DEFAULT_TUNING_3D_LOCALE
): string => `${TUNING_3D_ORIGIN}/${locale}/${page.path}`

/** UI language -> their locale. */
export const tuningLocaleFor = (lang: string): Tuning3dLocale => (lang === 'ru' || lang === 'ua' ? 'ru-RU' : 'en-US')

/** Pages by make key, then model key. */
export type TuningIndex = Map<string, Map<string, Tuning3dPage[]>>

export function buildTuningIndex(pages: readonly Tuning3dPage[]): TuningIndex {
  const index: TuningIndex = new Map()
  for (const page of pages) {
    const makeKey = tuningKey(page.makeSlug)
    const models = index.get(makeKey) ?? new Map<string, Tuning3dPage[]>()
    const modelKey = tuningKey(page.modelSlug)
    models.set(modelKey, [...(models.get(modelKey) ?? []), page])
    index.set(makeKey, models)
  }
  return index
}

/** Coarse body classes both sides map onto; a link never crosses a class. */
export const TUNING_BODY_FAMILIES = [
  'sedan',
  'hatchback',
  'wagon',
  'suv',
  'coupe',
  'convertible',
  'van',
  'pickup'
] as const
export type TuningBodyFamily = (typeof TUNING_BODY_FAMILIES)[number]

const PAGE_BODY_FAMILIES: readonly (readonly [RegExp, TuningBodyFamily])[] = [
  [/\b(sedan|saloon)\b/, 'sedan'],
  [/\bhatchback\b/, 'hatchback'],
  [/\b(wagon|estate|tourer|touring|avant|variant|shooting.brake)\b/, 'wagon'],
  [/\b(suv|crossover)\b/, 'suv'],
  [/\bcoupe\b/, 'coupe'],
  [/\b(convertible|cabriolet|roadster|spider|spyder|targa)\b/, 'convertible'],
  [/\b(van|minivan|mpv|minibus)\b/, 'van'],
  [/\b(pickup|truck)\b/, 'pickup']
]

/** Family of a 3DTuning page body (`3.door.hatchback`, `station.wagon`); null when it names none (`5`). */
export function pageBodyFamily(body: string): TuningBodyFamily | null {
  const text = body.toLowerCase().replace(/^\d\.door\./, '')
  return PAGE_BODY_FAMILIES.find(([re]) => re.test(text))?.[1] ?? null
}

/**
 * Families a registry body (`СЕДАН-B`, `УНІВЕРСАЛ`) may be on their side; null = unknown (trailers, trucks, free text).
 * `УНІВЕРСАЛ` is the registry's catch-all for non-sedan cars (estates, SUVs, hatchbacks, MPVs), so it allows all of those.
 */
export function registryBodyFamilies(body: string | null | undefined): readonly TuningBodyFamily[] | null {
  const text = (body ?? '').trim().toUpperCase()
  if (/^(СЕДАН|ЛІМУЗИН)/.test(text)) return ['sedan']
  if (/^(ХЕТЧБЕК|ЛІФТБЕК)/.test(text)) return ['hatchback']
  if (/^КУПЕ/.test(text)) return ['coupe']
  if (/^(КАБРІОЛЕТ|РОДСТЕР)/.test(text)) return ['convertible']
  if (/^КОМБІ/.test(text)) return ['wagon']
  if (/^УНІВЕРСАЛ/.test(text)) return ['wagon', 'suv', 'hatchback', 'van']
  if (/^ПІКАП/.test(text)) return ['pickup']
  if (/^(ПАСАЖИРСЬКИЙ|ВАНТАЖОПАСАЖИРСЬКИЙ|МІКРОАВТОБУС|ФУРГОН)/.test(text)) return ['van']
  return null
}

/** A newer generation of the same model exists in another body: our body's older page is stale by more than this many years. */
const MAX_STALE_YEARS = 2

export type TuningMiss =
  | 'make'
  | 'model'
  | 'year-unknown'
  | 'year-before'
  | 'year-gap'
  /** No page of this model in a body class the car can be, or the body is unknown and the model has several. */
  | 'body'
  /** Our body's page is older than a newer generation listed for another body. */
  | 'stale'

export type TuningMatch =
  /** One page: a confident link. */
  | { kind: 'unique'; page: Tuning3dPage }
  /** Several pages of one body class and ONE generation (door counts): the right car whichever is shown. */
  | { kind: 'same-generation'; pages: Tuning3dPage[] }
  /** Different generations (or body classes) start in the same year: do not link without more information. */
  | { kind: 'ambiguous'; pages: Tuning3dPage[] }
  | { kind: 'none'; reason: TuningMiss }

export type TuningQuery = {
  /** Our make slug (`mercedes-benz`). */
  make: string
  /** Our model slug and display name; each is tried (`5series`, `5 Series`). */
  models: readonly string[]
  year: number | null
  /** The registry body (`СЕДАН-B`); without it a link needs a model that has a single body class. */
  body?: string | null
}

/** Model keys to try on their side: ours, with our make prefix dropped (`mazda3` -> `3`), plus the alias table. */
function modelKeys(makeKey: string, models: readonly string[]): string[] {
  const keys = new Set<string>()
  for (const model of models) {
    const key = tuningKey(model)
    if (!key) continue
    keys.add(key)
    if (key.startsWith(makeKey) && key.length > makeKey.length) keys.add(key.slice(makeKey.length))
    for (const alias of MODEL_ALIASES[`${makeKey}/${key}`] ?? []) keys.add(alias)
  }
  return [...keys]
}

export function matchTuning(index: TuningIndex, query: TuningQuery): TuningMatch {
  const ownMakeKey = tuningKey(query.make)
  const makeKey = MAKE_ALIASES[ownMakeKey] ?? ownMakeKey
  const models = index.get(makeKey)
  if (!models) return { kind: 'none', reason: 'make' }
  if (query.year === null || !Number.isInteger(query.year)) return { kind: 'none', reason: 'year-unknown' }

  const pages = [...new Set(modelKeys(ownMakeKey, query.models).flatMap(key => models.get(key) ?? []))]
  if (!pages.length) return { kind: 'none', reason: 'model' }

  const known = pages.filter(p => pageBodyFamily(p.body))
  const families = registryBodyFamilies(query.body)
  const allowed = families
    ? known.filter(p => families.includes(pageBodyFamily(p.body)!))
    : new Set(known.map(p => pageBodyFamily(p.body))).size === 1
      ? known
      : []
  if (!allowed.length) return { kind: 'none', reason: 'body' }

  const startedAny = pages.filter(p => p.startYear <= query.year!)
  if (!startedAny.length) return { kind: 'none', reason: 'year-before' }
  const started = allowed.filter(p => p.startYear <= query.year!)
  if (!started.length) return { kind: 'none', reason: 'year-before' }
  const startYear = Math.max(...started.map(p => p.startYear))
  if (query.year - startYear > MAX_GENERATION_GAP_YEARS) return { kind: 'none', reason: 'year-gap' }
  if (Math.max(...startedAny.map(p => p.startYear)) - startYear > MAX_STALE_YEARS)
    return { kind: 'none', reason: 'stale' }

  const best = started.filter(p => p.startYear === startYear).sort((a, b) => a.path.localeCompare(b.path))
  if (best.length === 1) return { kind: 'unique', page: best[0]! }
  const sameFamily = new Set(best.map(p => pageBodyFamily(p.body))).size === 1
  const generations = new Set(best.map(p => tuningKey(p.generation)))
  return sameFamily && generations.size === 1
    ? { kind: 'same-generation', pages: best }
    : { kind: 'ambiguous', pages: best }
}

/** The answer of `GET /api/tuning`: the one page to link, or null. The client builds the URL (`tuningUrl`) for its language. */
export const tuningResponseSchema = z.object({
  link: z
    .object({
      path: z.string(),
      body: z.string(),
      generation: z.string(),
      startYear: z.number()
    })
    .nullable()
})
export type TuningResponse = z.infer<typeof tuningResponseSchema>
