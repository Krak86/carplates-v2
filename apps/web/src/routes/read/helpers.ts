import type { SizeModel } from '@carplates/shared'

import {
  CLASS_CUTS,
  SIZE_CLASSES,
  SIZE_SHAPES,
  sizeClass,
  sizeShape,
  type ClassResult,
  type SizeFigure,
  type SizeFigures,
  type SizeClass,
  type SizeShape
} from '@/components/size/VehicleSize.helpers'
import { displayBrand } from '@/lib/display-brand'
import { toIntlLocale } from '@/lib/intl'
import { LANG_FALLBACK, type ArticleMeta, type L10n } from '@/routes/read/types'

const PASSENGER_KIND = 'ЛЕГКОВИЙ'

/** The shapes an article or the explorer offers: passenger bodies, vans and pickups (no bikes, buses or trucks). */
export const EXPLORER_SHAPES: readonly SizeShape[] = SIZE_SHAPES.filter(
  s => s !== 'car' && s !== 'moto' && s !== 'bus' && s !== 'truck'
)

/** Segments with their own length table (A–F by length, J / M by shape); `van` and `pickup` are shapes, not rows. */
export const SEGMENT_CLASSES: readonly SizeClass[] = SIZE_CLASSES.filter(c => c !== 'van' && c !== 'pickup')

export type ModelProfile = {
  model: SizeModel
  shape: SizeShape
  /** True when a source named the body style (false for the generic `car` outline). */
  shapeKnown: boolean
  cls: ClassResult | null
}

/**
 * Big crossovers and vans whose body no data source gets right: the registry files every SUV as a wagon ("УНІВЕРСАЛ"), RDW
 * calls Tucson-sized crossovers MPVs, and "ПАСАЖИРСЬКИЙ" vans have no shape at all. Named here so they land where a reader looks.
 */
const SUV_MODELS =
  /\b(TUCSON|SPORTAGE|QASHQAI|DUSTER|X-TRAIL|CAPTUR|KADJAR|KUGA|ECOSPORT|JUKE|ASX|IX35|CRETA|SELTOS|KAMIQ|KAROQ|KODIAQ|YETI|T-ROC|TIGUAN|MOKKA|NIVA|RAV ?4|CR-V|LAND CRUISER|PRADO|PAJERO|OUTLANDER|SANTA FE|SORENTO|TOUAREG|CAYENNE|VITARA|FORESTER|COMPASS|CHEROKEE|WRANGLER)\b/
const VAN_MODELS = /\b(TRANSPORTER|TRANSIT|SPRINTER|VITO|TRAFIC|MASTER|CRAFTER|BOXER|DUCATO|JUMPER)\b/

/**
 * A model's usual shape and approximate segment. A model sells in several bodies (Passat, Golf), so this is the *majority*
 * style: the named SUVs and vans first, then the registry body of the fleet (sedan, hatch, coupe …), then — because the
 * registry files wagons and SUVs alike as "УНІВЕРСАЛ" — RDW's usual body type, then that wagon. The segment needs a length.
 */
export function profileModel(model: SizeModel): ModelProfile {
  const name = `${model.brand} ${model.model}`.toUpperCase()
  const named: SizeShape | null = SUV_MODELS.test(name) ? 'suv' : VAN_MODELS.test(name) ? 'van' : null
  const fromRegistry = sizeShape({ kind: PASSENGER_KIND, body: model.body })
  const fromRdw = model.rdwBody
    ? sizeShape({ kind: PASSENGER_KIND, rdwBodyTypes: [{ key: model.rdwBody, share: 1 }] })
    : null

  const resolved =
    (named ? { shape: named, known: true } : null) ??
    (fromRegistry?.known && fromRegistry.shape !== 'wagon' ? fromRegistry : null) ??
    (fromRdw?.known ? fromRdw : null) ??
    fromRegistry
  const shape = resolved?.shape ?? 'car'
  return {
    model,
    shape,
    shapeKnown: resolved?.known ?? false,
    cls: model.lengthMm ? sizeClass(model.lengthMm, shape) : null
  }
}

export const modelId = (model: Pick<SizeModel, 'brand' | 'model'>): string => `${model.brand}|${model.model}`

const SHORT_HYPHENATED = /^[A-Z0-9]{1,3}-[A-Z0-9]{1,2}$/

/** "Land Cruiser Prado", "RAV4", "CR-V": title-case words; words with digits, short acronyms and "CR-V" stay upper-case. */
export function displayModel(model: string): string {
  return model
    .trim()
    .split(/\s+/)
    .map(word =>
      /\d/.test(word) || word.length <= 3 || SHORT_HYPHENATED.test(word.toUpperCase())
        ? word.toUpperCase()
        : displayBrand(word)
    )
    .join(' ')
}

export const displayName = (model: Pick<SizeModel, 'brand' | 'model'>): string =>
  `${displayBrand(model.brand)} ${displayModel(model.model)}`

/** "259 728" — a fleet count in the reader's locale. */
export const formatCount = (n: number, language: string): string => n.toLocaleString(toIntlLocale(language))

/** Picks the reader's language from inline prose. */
export const pick = (text: L10n, language: string): string => text[language as keyof L10n] ?? text[LANG_FALLBACK]

/** Topic chips of the guides hub: every distinct tag (keyed by its English text), the most used first, ties in hub order. */
export function articleTopics(articles: readonly ArticleMeta[]): L10n[] {
  const topics = new Map<string, { tag: L10n; count: number }>()
  for (const article of articles) {
    for (const tag of article.tags) {
      const known = topics.get(tag.en)
      if (known) known.count += 1
      else topics.set(tag.en, { tag, count: 1 })
    }
  }
  return [...topics.values()].sort((a, b) => b.count - a.count).map(topic => topic.tag)
}

/** Guides matching the hub's search box (title, lead or a tag, case-insensitive) and the picked topic (an English tag, '' = all). */
export function filterArticles(
  articles: readonly ArticleMeta[],
  query: string,
  topic: string,
  language: string,
  titleOf: (article: ArticleMeta) => string
): ArticleMeta[] {
  const needle = query.trim().toLowerCase()
  return articles.filter(article => {
    if (topic && !article.tags.some(tag => tag.en === topic)) return false
    if (!needle) return true
    const haystack = [titleOf(article), pick(article.lead, language), ...article.tags.map(tag => pick(tag, language))]
    return haystack.some(text => text.toLowerCase().includes(needle))
  })
}

export type LengthRange = { fromMm: number | null; toMm: number | null }

/** Length range of segment A–F for one cut table (`CLASS_CUTS.compact` / `.long`). */
export function segmentRange(cls: SizeClass, variant: keyof typeof CLASS_CUTS): LengthRange | null {
  const index = (['A', 'B', 'C', 'D', 'E', 'F'] as const).findIndex(c => c === cls)
  if (index < 0) return null
  const cuts = CLASS_CUTS[variant]
  return { fromMm: index > 0 ? (cuts[index - 1] ?? null) : null, toMm: cuts[index] ?? null }
}

export type ExplorerFilter = { shape: SizeShape | null; cls: SizeClass | null; text: string }

/** Models matching the explorer's shape / segment chips and brand-or-model text, biggest fleets first. */
export function filterProfiles(
  profiles: readonly ModelProfile[],
  { shape, cls, text }: ExplorerFilter
): ModelProfile[] {
  const needle = text.trim().toLowerCase()
  return profiles
    .filter(p => !shape || p.shape === shape)
    .filter(p => !cls || p.cls?.cls === cls)
    .filter(p => !needle || `${p.model.brand} ${p.model.model}`.toLowerCase().includes(needle))
    .sort((a, b) => b.model.n - a.model.n)
}

/** The `count` biggest fleets of one segment (models with a length only: the segment comes from it). */
export const topOfSegment = (profiles: readonly ModelProfile[], cls: SizeClass, count: number): ModelProfile[] =>
  filterProfiles(profiles, { shape: null, cls, text: '' }).slice(0, count)

/** Cars per segment over the models that have a length, plus the cars that could not be placed. */
export function fleetBySegment(profiles: readonly ModelProfile[]): {
  byClass: Map<SizeClass, number>
  unplaced: number
} {
  const byClass = new Map<SizeClass, number>()
  let unplaced = 0
  for (const p of profiles) {
    if (p.cls) byClass.set(p.cls.cls, (byClass.get(p.cls.cls) ?? 0) + p.model.n)
    else unplaced += p.model.n
  }
  return { byClass, unplaced }
}

/** Parses a `?shape=` / `?class=` value against a known list; anything else is null. */
export const parseOneOf = <T extends string>(value: string | null | undefined, list: readonly T[]): T | null =>
  list.find(item => item === value) ?? null

const figureOf = (value: number | null | undefined): SizeFigure | null =>
  value ? { value, source: 'rdw', spread: null } : null

/** Catalogue dimensions of a registry model as the Size section's figures (what the to-scale drawing takes). */
export const figuresOf = ({ model }: ModelProfile): SizeFigures => ({
  lengthMm: figureOf(model.lengthMm),
  widthMm: figureOf(model.widthMm),
  heightMm: figureOf(model.heightMm),
  wheelbaseMm: figureOf(model.wheelbaseMm)
})
