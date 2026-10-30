import type {
  CatalogModel,
  EuroNcapRating,
  GenerationGrowthItem,
  MotBand,
  RdwMatchInfo,
  VehicleFuel,
  WikiSpecsResponse
} from '@carplates/shared'

/** What one compare slot was given: a plate, a VIN, or a catalog model (slugs, year, optional fuel class). */
export type CompareRef =
  | { kind: 'plate'; plate: string }
  | { kind: 'vin'; vin: string }
  | { kind: 'model'; make: string; model: string; year: number; fuel: VehicleFuel | null }

export const COMPARE_SLOTS = ['a', 'b'] as const
export type CompareSlot = (typeof COMPARE_SLOTS)[number]

/** Facts about this exact car (plate / VIN only); never the owner (`person`). */
export type ExactFacts = {
  plate: string | null
  vin: string | null
  year: number | null
  color: string | null
  region: string | null
  /** Year of the latest registration action. */
  registeredYear: number | null
  ownersCount: number | null
  historyCount: number | null
  operName: string | null
  everImported: boolean | null
  /** The registry's own figures; the model-level rows show the fleet value of the same measure. */
  capacity: number | null
  powerKw: number | null
  ownWeight: number | null
  totalWeight: number | null
}

/** Every input resolved to one shape: the inputs to the model-level queries plus the registry facts of the exact car. */
export type CompareCar = {
  ref: CompareRef
  /** Raw registry (or catalog top) spelling: what every model-level query is asked with. */
  brand: string | null
  model: string | null
  year: number | null
  kind: string | null
  /** Registry fuel word (or a fuel keyword for a model ref). */
  fuel: string | null
  capacity: number | null
  powerKw: number | null
  body: string | null
  ownWeight: number | null
  totalWeight: number | null
  /** Plate / VIN only. */
  exact: ExactFacts | null
}

/** Row groups in display order; the heading is `compare.group.<key>`. */
export const COMPARE_GROUPS = [
  'overview',
  'engine',
  'size',
  'economy',
  'price',
  'safety',
  'reliability',
  'ukraine',
  'exact'
] as const
export type CompareGroup = (typeof COMPARE_GROUPS)[number]

/** Where a figure comes from; also what the coverage strip lists. */
export const COMPARE_SOURCES = ['registry', 'rdw', 'wiki', 'safety', 'mot', 'recalls'] as const
export type CompareSource = (typeof COMPARE_SOURCES)[number]

export type CompareValue = number | string | boolean | null

/** How the UI prints a value; raw registry words are localized at render time. */
export type CompareValueKind = 'number' | 'text' | 'bool' | 'fuel' | 'body' | 'color' | 'region' | 'percent'

export type CompareDirection = 'higher' | 'lower' | 'neutral'

export type CompareRow = {
  id: string
  group: CompareGroup
  /** i18n key of the row label. */
  labelKey: string
  /** i18n key of the unit, when the value has one. */
  unitKey?: string
  values: readonly [CompareValue, CompareValue]
  valueKind: CompareValueKind
  /** Which side is "better" when the values differ; `neutral` highlights nothing. */
  direction: CompareDirection
  source: CompareSource
  /** Fraction digits kept when printing a number. */
  decimals?: number
  /** i18n key of the "?" explainer, when one exists. */
  aboutKey?: string
  /** Typical figures built from a thin sample (RDW `RDW_MIN_DISPLAY_N`) on either side. */
  smallSample?: boolean
}

/** The model-level answers of one car, as the queries returned them (null = no match / not asked). */
export type CompareLoaded = {
  car: CompareCar | null
  rdw: RdwMatchInfo | null
  wiki: WikiSpecsResponse['match'] | null
  euroNcap: EuroNcapRating | null
  /** Mean NHTSA overall stars over the matching trims. */
  nhtsaStars: number | null
  rdwRecalls: number | null
  nhtsaRecalls: number | null
  nhtsaComplaints: number | null
  /** Share of UK MOT tests the model failed, all mileage bands pooled. */
  motFailRate: number | null
  /** The MOT bands behind the fail rate (for the curve by mileage). */
  mot: { edgesKm: number[]; bands: MotBand[] } | null
  /** Every generation of the model with its production years (for the Gantt). */
  generations: GenerationGrowthItem[] | null
  catalog: CatalogModel | null
}
