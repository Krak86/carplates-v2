import { resolveVehicleKind } from '@carplates/shared'
import type { RdwSpecs, WikiDimensions, WikiSource } from '@carplates/shared'

import { wikiSourceLabel } from '@/components/WikiSpecs.helpers'

/** Where a size figure comes from, best first. `estimate` is our own forecast, never a measured value. */
export type SizeSource = 'rdw' | 'wiki' | 'vin' | 'estimate'

export const SIZE_FIELDS = ['lengthMm', 'widthMm', 'heightMm', 'wheelbaseMm'] as const
export type SizeField = (typeof SIZE_FIELDS)[number]

export type SizeFigure = {
  /** Millimetres. */
  value: number
  source: SizeSource
  /** min–max over the vehicles behind an RDW median; null for a single catalogue value. */
  spread?: { min: number; max: number } | null
}

export type SizeFigures = Record<SizeField, SizeFigure | null>

export const SIZE_TABS = ['schema', 'parking', 'garage', 'norms'] as const
export type SizeTab = (typeof SIZE_TABS)[number]
export const DEFAULT_SIZE_TAB: SizeTab = 'schema'

/** A `?tab=` value from a share link; anything unknown opens the first tab. */
export function parseSizeTab(value: string | null | undefined): SizeTab {
  return SIZE_TABS.find(tab => tab === value) ?? DEFAULT_SIZE_TAB
}

/** Body shapes the schema can draw. `car` = a passenger car whose body style nobody told us. */
export const SIZE_SHAPES = [
  'car',
  'hatch',
  'sedan',
  'wagon',
  'coupe',
  'suv',
  'mpv',
  'van',
  'pickup',
  'moto',
  'bus',
  'truck'
] as const
export type SizeShape = (typeof SIZE_SHAPES)[number]

/** Shapes a vehicle of this kind may have the size class of a passenger car. */
const PASSENGER_SHAPES: readonly SizeShape[] = ['car', 'hatch', 'sedan', 'wagon', 'coupe', 'suv', 'mpv']
export const isPassengerShape = (shape: SizeShape | null): boolean => !!shape && PASSENGER_SHAPES.includes(shape)

/** Registry `body` keywords (free text, "-B" suffix tolerated) -> shape. First match wins. */
const REGISTRY_BODY_RULES: ReadonlyArray<readonly [SizeShape, RegExp]> = [
  ['pickup', /ПІКАП/],
  ['hatch', /ХЕТЧБЕК|ЛІФТБЕК/],
  ['wagon', /УНІВЕРСАЛ/],
  ['coupe', /КУПЕ|КАБРІОЛЕТ|РОДСТЕР|ФАЕТОН/],
  ['suv', /ПОЗАШЛЯХ|КРОСОВЕР/],
  ['mpv', /МІНІВЕН|ПАСАЖИРСЬКИЙ ФУРГОН/],
  ['van', /МІКРОАВТОБУС|ФУРГОН/],
  ['sedan', /СЕДАН/]
]

/** RDW `bodyTypes` keys -> shape. */
const RDW_BODY_SHAPES: Readonly<Record<string, SizeShape>> = {
  hatchback: 'hatch',
  stationwagen: 'wagon',
  sedan: 'sedan',
  MPV: 'mpv',
  cabriolet: 'coupe',
  coupe: 'coupe',
  terreinvoertuig: 'suv',
  'pick-up truck': 'pickup',
  'gesloten opbouw': 'van'
}

/** NHTSA `Body Class` text -> shape. */
const VIN_BODY_RULES: ReadonlyArray<readonly [SizeShape, RegExp]> = [
  ['moto', /motorcycle|moped|scooter/i],
  ['pickup', /pickup/i],
  ['hatch', /hatchback|liftback/i],
  ['wagon', /wagon/i],
  ['coupe', /coupe|convertible|cabriolet|roadster/i],
  ['suv', /sport utility|crossover|suv/i],
  ['mpv', /minivan|multi-purpose/i],
  ['van', /\bvan\b/i],
  ['sedan', /sedan|saloon/i],
  ['bus', /\bbus\b/i],
  ['truck', /\btruck\b/i]
]

export type ShapeInput = {
  /** Registry `kind` text (ЛЕГКОВИЙ …). */
  kind?: string | null
  /** Registry `body` text (СЕДАН-B …). */
  body?: string | null
  /** RDW body-type shares, largest first. */
  rdwBodyTypes?: ReadonlyArray<{ key: string; share: number }> | null
  /** NHTSA `Body Class`. */
  vinBodyClass?: string | null
}

export type ShapeResult = {
  shape: SizeShape
  /** True when a source named the body style; false for the generic `car` fallback. */
  known: boolean
}

/**
 * The body shape to draw: the registry body first (it describes this very car), then the model's usual RDW body type,
 * then the NHTSA body class, then the registry kind alone. Null for vehicles with no sensible outline (trailers …).
 */
export function sizeShape({ kind, body, rdwBodyTypes, vinBodyClass }: ShapeInput): ShapeResult | null {
  const resolved = resolveVehicleKind(kind)
  if (resolved === 'bus') return { shape: 'bus', known: true }
  if (resolved === 'motorcycle' || resolved === 'moped' || resolved === 'motoTricycle' || resolved === 'quad') {
    return { shape: 'moto', known: true }
  }
  if (resolved === 'trailer' || resolved === 'semiTrailer' || resolved === 'special' || resolved === 'specialized') {
    return null
  }

  const text = (body ?? '').toUpperCase()
  const fromBody = REGISTRY_BODY_RULES.find(([, rule]) => rule.test(text))?.[0]
  if (fromBody && !(resolved === 'truck' && fromBody === 'sedan')) return { shape: fromBody, known: true }

  if (resolved === 'truck') return { shape: 'truck', known: true }

  const top = rdwBodyTypes?.[0]?.key
  const fromRdw = top ? RDW_BODY_SHAPES[top] : undefined
  if (fromRdw) return { shape: fromRdw, known: true }

  const vinText = vinBodyClass ?? ''
  const fromVin = VIN_BODY_RULES.find(([, rule]) => rule.test(vinText))?.[0]
  if (fromVin) return { shape: fromVin, known: true }

  return { shape: 'car', known: false }
}

/** inch -> mm. */
const INCH_MM = 25.4

/** NHTSA "Wheel Base (inches) From/To" -> mm (the mean when both are there); null without a usable number. */
export function vinWheelbaseMm(fields: ReadonlyMap<string, string> | null | undefined): number | null {
  if (!fields) return null
  const read = (name: string): number | null => {
    const n = Number.parseFloat(fields.get(name) ?? '')
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const from = read('Wheel Base (inches) From')
  const to = read('Wheel Base (inches) To')
  const inches = from != null && to != null ? (from + to) / 2 : (from ?? to)
  return inches == null ? null : Math.round(inches * INCH_MM)
}

export type MergeInput = {
  rdw?: RdwSpecs | null
  wiki?: WikiDimensions | null
  /** NHTSA wheelbase, mm. */
  vinWheelbaseMm?: number | null
}

const RDW_PICKS: Readonly<Record<SizeField, (s: RdwSpecs) => NonNullable<RdwSpecs['lengthCm']> | null>> = {
  lengthMm: s => s.lengthCm ?? null,
  widthMm: s => s.widthCm ?? null,
  heightMm: s => s.heightCm ?? null,
  wheelbaseMm: s => s.wheelbaseCm ?? null
}

/**
 * One figure per field, best source first: RDW's fleet median (cm -> mm; the API already hides a field built from fewer
 * than ten vehicles), then the Wikipedia generation's catalogue value, then the VIN decode (wheelbase only).
 */
export function mergeSize({ rdw, wiki, vinWheelbaseMm: vinWb }: MergeInput): SizeFigures {
  const out = {} as SizeFigures
  for (const field of SIZE_FIELDS) {
    const range = rdw ? RDW_PICKS[field](rdw) : null
    const wikiValue = wiki?.[field]
    if (range) {
      out[field] = {
        value: Math.round(range.median * 10),
        source: 'rdw',
        spread: { min: Math.round(range.min * 10), max: Math.round(range.max * 10) }
      }
    } else if (wikiValue != null && wikiValue > 0) {
      out[field] = { value: Math.round(wikiValue), source: 'wiki' }
    } else if (field === 'wheelbaseMm' && vinWb != null) {
      out[field] = { value: vinWb, source: 'vin' }
    } else {
      out[field] = null
    }
  }
  return out
}

type Typical = Record<SizeField, number>

/**
 * Typical outer dimensions (mm) per shape: rounded means of well-known current models of that shape (e.g. hatch: Polo
 * 4053, Golf 4284, Focus 4378 long). Rules of thumb for a forecast, not a statistic of any register.
 */
export const SHAPE_TYPICAL: Readonly<Partial<Record<SizeShape, Typical>>> = {
  car: { lengthMm: 4500, widthMm: 1820, heightMm: 1500, wheelbaseMm: 2700 },
  hatch: { lengthMm: 4200, widthMm: 1780, heightMm: 1470, wheelbaseMm: 2600 },
  sedan: { lengthMm: 4650, widthMm: 1820, heightMm: 1450, wheelbaseMm: 2750 },
  wagon: { lengthMm: 4650, widthMm: 1820, heightMm: 1470, wheelbaseMm: 2740 },
  coupe: { lengthMm: 4500, widthMm: 1830, heightMm: 1350, wheelbaseMm: 2680 },
  suv: { lengthMm: 4500, widthMm: 1860, heightMm: 1650, wheelbaseMm: 2700 },
  mpv: { lengthMm: 4500, widthMm: 1840, heightMm: 1680, wheelbaseMm: 2750 },
  van: { lengthMm: 4900, widthMm: 1980, heightMm: 1950, wheelbaseMm: 3000 },
  pickup: { lengthMm: 5300, widthMm: 1900, heightMm: 1800, wheelbaseMm: 3200 },
  moto: { lengthMm: 2100, widthMm: 800, heightMm: 1150, wheelbaseMm: 1450 }
}

/**
 * How fast each dimension grows when the vehicle gets longer: wheelbase follows the length, width and height much less
 * (a car 10 % longer is about 5 % wider and 3 % taller).
 */
const GROWTH_EXPONENT: Readonly<Record<SizeField, number>> = {
  lengthMm: 1,
  wheelbaseMm: 1,
  widthMm: 0.5,
  heightMm: 0.3
}

/** The anchor order: the figure that best tells how big the vehicle is. */
const ANCHOR_ORDER: readonly SizeField[] = ['lengthMm', 'wheelbaseMm', 'widthMm', 'heightMm']

/** Scale factors outside this range are not a believable forecast for the shape. */
const MIN_SCALE = 0.6
const MAX_SCALE = 1.7

export type CompleteSize = {
  figures: SizeFigures
  /** The fields that were filled by the forecast. */
  estimated: readonly SizeField[]
  /** No published figure at all: every number is the shape's typical one. */
  typicalOnly: boolean
}

/**
 * Fills the missing fields from the ones we have: the best known figure sets a scale against the shape's typical
 * vehicle and the gaps follow it with their own growth exponent. With nothing known, a shape whose body style is known
 * gets its typical figures (`typicalOnly`). Null when there is nothing honest to show.
 */
export function completeSize(figures: SizeFigures, shape: ShapeResult | null): CompleteSize | null {
  if (!shape) return null
  const typical = SHAPE_TYPICAL[shape.shape]
  const missing = SIZE_FIELDS.filter(f => !figures[f])
  const anchor = ANCHOR_ORDER.find(f => figures[f])

  if (missing.length === 0) return { figures, estimated: [], typicalOnly: false }
  // Buses and trucks vary too much for a typical one: show what is known, forecast nothing.
  if (!typical) return anchor ? { figures, estimated: [], typicalOnly: false } : null
  if (!anchor && !shape.known) return null

  const anchorValue = anchor ? (figures[anchor]?.value ?? null) : null
  const raw = anchor && anchorValue != null ? (anchorValue / typical[anchor]) ** (1 / GROWTH_EXPONENT[anchor]) : 1
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))

  const out = { ...figures }
  for (const field of missing) {
    out[field] = { value: Math.round((typical[field] * scale ** GROWTH_EXPONENT[field]) / 10) * 10, source: 'estimate' }
  }
  return { figures: out, estimated: missing, typicalOnly: !anchor }
}

/** European segments by length, from the rule-of-thumb table the section quotes (never an official class). */
export const SIZE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'M', 'van', 'pickup'] as const
export type SizeClass = (typeof SIZE_CLASSES)[number]

/** Upper length edges (mm) of A, B, C, D, E for hatchbacks / generic cars and for notchbacks, estates and coupes. */
export const CLASS_CUTS: Readonly<Record<'compact' | 'long', readonly number[]>> = {
  compact: [3800, 4200, 4500, 4900, 5100],
  long: [3800, 4500, 4700, 4900, 5100]
}

/** Length cuts (mm) of the size words small / compact / mid-size / large shown for SUVs and MPVs. */
export const SUB_CUTS: readonly number[] = [4300, 4650, 4900]

export type ClassResult = {
  cls: SizeClass
  /** 0-3 index into `rdw.size.*` for J / M, which are segments of their own; null elsewhere. */
  sub: number | null
}

/** The approximate European segment of a vehicle of this shape and length; null for shapes without one. */
export function sizeClass(lengthMm: number, shape: SizeShape): ClassResult | null {
  if (shape === 'suv' || shape === 'mpv') {
    return { cls: shape === 'suv' ? 'J' : 'M', sub: SUB_CUTS.filter(cut => lengthMm >= cut).length }
  }
  if (shape === 'van') return { cls: 'van', sub: null }
  if (shape === 'pickup') return { cls: 'pickup', sub: null }
  if (!isPassengerShape(shape)) return null

  const cuts = shape === 'sedan' || shape === 'wagon' || shape === 'coupe' ? CLASS_CUTS.long : CLASS_CUTS.compact
  const index = cuts.filter(cut => lengthMm >= cut).length
  return { cls: (['A', 'B', 'C', 'D', 'E', 'F'] as const)[index] ?? 'F', sub: null }
}

/** "4.28" metres for 4284 mm. */
export const mmToMetres = (mm: number): string => String(Number((mm / 1000).toFixed(2)))

/** "4 284" for 4284 mm in the reader's locale (the app's `ua` is the `uk` BCP-47 tag). */
export const formatMm = (mm: number, language: string): string =>
  Math.round(mm).toLocaleString(language === 'ua' ? 'uk' : language)

/** "≈ " in front of a forecast value, nothing for a published one. */
export const estimatePrefix = (source: SizeSource): string => (source === 'estimate' ? '≈ ' : '')

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Display name of a figure's source: "RDW (NL)", "Wikipedia (DE)", "VIN (NHTSA)" or "≈ estimate". */
export function sourceLabel(source: SizeSource, wiki: Pick<WikiSource, 'lang' | 'title'> | null, t: Translate): string {
  if (source === 'wiki' && wiki) return wikiSourceLabel(wiki)
  return t(`size.source.${source}`)
}

/** "length, width: RDW (NL) · wheelbase: Wikipedia (DE) · height: ≈ estimate" — which source gave which figure. */
export function leadParts(
  figures: SizeFigures,
  wiki: Pick<WikiSource, 'lang' | 'title'> | null,
  t: Translate
): string[] {
  const bySource = new Map<SizeSource, SizeField[]>()
  for (const field of SIZE_FIELDS) {
    const source = figures[field]?.source
    if (source) bySource.set(source, [...(bySource.get(source) ?? []), field])
  }
  return [...bySource].map(
    ([source, fields]) =>
      `${fields.map(f => t(`size.field.${f}`).toLowerCase()).join(', ')}: ${sourceLabel(source, wiki, t)}`
  )
}
