import type { SizeShape } from '@/components/size/VehicleSize.helpers'

/** Outer size of the car, mm, without mirrors. */
export type Dims = { lengthMm: number; widthMm: number; heightMm: number }

export const FIT_VERDICTS = ['comfortable', 'tight', 'no'] as const
export type FitVerdict = (typeof FIT_VERDICTS)[number]

/** Both mirrors add about this much to the body width (not in any dataset: an assumption the UI states). */
export const MIRRORS_MM = 200
/** Free width left around the car (a bay: both sides together; a garage: each gap) for "comfortable" / "tight". */
export const COMFORT_SIDE_MM = 400
export const TIGHT_SIDE_MM = 100
/** Same for the length of a bay. */
export const COMFORT_LENGTH_MM = 200
export const TIGHT_LENGTH_MM = 0
/** A garage door needs less room than a bay: the car drives through it, nobody opens a door in it. */
export const COMFORT_DOOR_MM = 300
export const TIGHT_DOOR_MM = 100
/** Height margins under a door lintel / sign. */
export const COMFORT_HEIGHT_MM = 150

export const verdictFromSlack = (slack: number, comfort: number, tight: number): FitVerdict =>
  slack >= comfort ? 'comfortable' : slack >= tight ? 'tight' : 'no'

const RANK: Readonly<Record<FitVerdict, number>> = { comfortable: 0, tight: 1, no: 2 }

/** The worst of several verdicts. */
export const worstVerdict = (verdicts: readonly FitVerdict[]): FitVerdict =>
  verdicts.reduce<FitVerdict>((worst, v) => (RANK[v] > RANK[worst] ? v : worst), 'comfortable')

export const MARKETS = ['UA', 'DE', 'US'] as const
export type NormMarket = (typeof MARKETS)[number]

export type NormLink = {
  /** `size.link.<id>.title` / `.what` in i18n; `url` opens in a new tab with the ↗ marker. */
  id: string
  url: string
  market: NormMarket
  /** Clause the figures come from, shown verbatim ("п. 5.2"). */
  clause: string
}

export type ParkingRef = {
  /** `size.bay.<id>` in i18n. */
  id: string
  market: NormMarket
  lengthMm: number
  widthMm: number
  /** The `LEGAL_LINKS` entry the figure comes from. */
  link: string
  /** True for a binding minimum / norm, false for a typical or example value. */
  isNorm: boolean
}

// ДБН В.2.3-15:2007 п. 5.2: 2,5 x 5,3 m for medium cars, 2,3 x 5,0 m allowed on temporary lots (both with a 0,5 m
// safety gap). German Garagenverordnung (Länder): at least 5 m long and 2,30 m wide with no wall beside it.
// US: 9 x 18 ft is the usual city-code stall (many cities accept 8,5 ft).
export const PARKING_REFS: readonly ParkingRef[] = [
  { id: 'ua', market: 'UA', lengthMm: 5300, widthMm: 2500, link: 'ua-dbn', isNorm: true },
  { id: 'uaTemp', market: 'UA', lengthMm: 5000, widthMm: 2300, link: 'ua-dbn', isNorm: true },
  { id: 'de', market: 'DE', lengthMm: 5000, widthMm: 2300, link: 'de-gav', isNorm: true },
  { id: 'us', market: 'US', lengthMm: 5486, widthMm: 2743, link: 'us-stall', isNorm: true }
]

export const LEGAL_LINKS: readonly NormLink[] = [
  {
    id: 'ua-dbn',
    url: 'https://e-construction.gov.ua/laws_detail/2845786368808847244?doc_type=2',
    market: 'UA',
    clause: 'п. 5.2'
  },
  {
    id: 'ua-pdr',
    url: 'https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF',
    market: 'UA',
    clause: 'п. 22.5(а)'
  },
  {
    id: 'de-gav',
    url: 'https://revosax.sachsen.de/vorschrift_gesamt/4032/31992.pdf',
    market: 'DE',
    clause: '§ 4'
  },
  {
    id: 'us-stall',
    url: 'https://lindon.municipal.codes/Code/17.18.020',
    market: 'US',
    clause: '17.18.020'
  }
]

export const linkById = (id: string): NormLink | undefined => LEGAL_LINKS.find(l => l.id === id)

export type FitSlack = {
  /** Free millimetres on each side of the car (mirrors included); negative = does not fit. */
  sideMm: number
  /** Free millimetres along the car. */
  lengthMm: number
  verdict: FitVerdict
}

/** One car in a bay of `bayWidthMm` x `bayLengthMm`. */
export function fitInBay(dims: Dims, bayWidthMm: number, bayLengthMm: number): FitSlack {
  const sideMm = (bayWidthMm - (dims.widthMm + MIRRORS_MM)) / 2
  const lengthMm = bayLengthMm - dims.lengthMm
  return {
    sideMm,
    lengthMm,
    // `sideMm` is per side; the thresholds are for both sides together.
    verdict: worstVerdict([
      verdictFromSlack(sideMm * 2, COMFORT_SIDE_MM, TIGHT_SIDE_MM),
      verdictFromSlack(lengthMm, COMFORT_LENGTH_MM, TIGHT_LENGTH_MM)
    ])
  }
}

export type GarageRef = {
  /** `size.garage.<id>` in i18n. */
  id: 'single' | 'double'
  widthMm: number
  lengthMm: number
  /** Cars standing side by side. */
  cars: 1 | 2
  doorWidthMm: number
  doorHeightMm: number
}

// Typical Ukrainian garage-cooperative box and a double garage — "typical", not a norm: owners' boxes vary a lot.
export const GARAGE_REFS: readonly GarageRef[] = [
  { id: 'single', widthMm: 3000, lengthMm: 6000, cars: 1, doorWidthMm: 2400, doorHeightMm: 2100 },
  { id: 'double', widthMm: 6000, lengthMm: 6000, cars: 2, doorWidthMm: 4800, doorHeightMm: 2100 }
]

export type GarageFit = {
  verdict: FitVerdict
  /** Free millimetres in each gap between walls and cars (cars + 1 gaps). */
  gapMm: number
  lengthMm: number
  /** Door width left beside one car (both sides together); height left under the lintel. */
  doorMm: number
  heightMm: number
  parts: { width: FitVerdict; length: FitVerdict; door: FitVerdict; height: FitVerdict }
}

export function fitInGarage(dims: Dims, garage: GarageRef): GarageFit {
  const carWidth = dims.widthMm + MIRRORS_MM
  const gapMm = (garage.widthMm - carWidth * garage.cars) / (garage.cars + 1)
  const lengthMm = garage.lengthMm - dims.lengthMm
  const doorMm = garage.doorWidthMm / (garage.cars === 2 ? 2 : 1) - carWidth
  const heightMm = garage.doorHeightMm - dims.heightMm
  const parts = {
    width: verdictFromSlack(gapMm, COMFORT_SIDE_MM, TIGHT_SIDE_MM),
    length: verdictFromSlack(lengthMm, COMFORT_LENGTH_MM, TIGHT_LENGTH_MM),
    door: verdictFromSlack(doorMm, COMFORT_DOOR_MM, TIGHT_DOOR_MM),
    height: verdictFromSlack(heightMm, COMFORT_HEIGHT_MM, 0)
  }
  return { verdict: worstVerdict(Object.values(parts)), gapMm, lengthMm, doorMm, heightMm, parts }
}

/** ПДР України п. 22.5(а): the largest vehicle that may drive without a special permit, mm. */
export const ROAD_LIMITS = {
  widthMm: 2600,
  heightMm: 4000,
  /** A single lorry or bus. */
  lengthMm: 12000,
  /** A tractor with a semi-trailer. */
  tractorLengthMm: 18750,
  /** A lorry with a trailer. */
  trainLengthMm: 22000
} as const

export type RoadCheck = { id: 'width' | 'height' | 'length'; valueMm: number; limitMm: number; ok: boolean }

/** The size against the ПДР limits that apply to every vehicle (width, height, single-vehicle length). */
export function roadChecks(dims: Dims): RoadCheck[] {
  return [
    { id: 'width', valueMm: dims.widthMm, limitMm: ROAD_LIMITS.widthMm, ok: dims.widthMm <= ROAD_LIMITS.widthMm },
    { id: 'height', valueMm: dims.heightMm, limitMm: ROAD_LIMITS.heightMm, ok: dims.heightMm <= ROAD_LIMITS.heightMm },
    { id: 'length', valueMm: dims.lengthMm, limitMm: ROAD_LIMITS.lengthMm, ok: dims.lengthMm <= ROAD_LIMITS.lengthMm }
  ]
}

export type Tip = {
  /** `size.tip.<key>` in i18n. */
  key: string
  /** Good news or a warning: picks the icon. */
  tone: 'easy' | 'hard'
  params: Record<string, string>
}

/** Mechanical ("puzzle") parking lifts usually cap the car height here. */
export const MECHANICAL_HEIGHT_MM = 1550
/** A typical underground-garage sign. */
export const CLEARANCE_MM = 2000
/** A roof box adds about this much. */
export const ROOF_BOX_MM = 400
/** Parallel parking: the gap needed is the car plus about a metre to swing in. */
export const PARALLEL_EXTRA_MM = 1000

const metres = (mm: number): string => String(Number((mm / 1000).toFixed(2)))

/** Plain-language tips picked by rule from the figures: never shown when they do not apply. */
export function sizeTips(dims: Dims, shape: SizeShape): Tip[] {
  if (shape === 'moto') return [{ key: 'moto', tone: 'easy', params: {} }]
  const tips: Tip[] = []
  const { lengthMm, widthMm, heightMm } = dims

  if (lengthMm <= 3800) tips.push({ key: 'tiny', tone: 'easy', params: { length: metres(lengthMm) } })
  if (lengthMm >= 4900) tips.push({ key: 'long', tone: 'hard', params: { length: metres(lengthMm) } })
  if (widthMm >= 1900) {
    tips.push({ key: 'wide', tone: 'hard', params: { width: metres(widthMm + MIRRORS_MM) } })
  }
  tips.push({ key: 'parallel', tone: 'easy', params: { gap: metres(lengthMm + PARALLEL_EXTRA_MM) } })
  if (heightMm > MECHANICAL_HEIGHT_MM) {
    tips.push({
      key: 'mechanical',
      tone: 'hard',
      params: { height: metres(heightMm), limit: metres(MECHANICAL_HEIGHT_MM) }
    })
  }
  if (heightMm + ROOF_BOX_MM > CLEARANCE_MM) {
    tips.push({
      key: heightMm > CLEARANCE_MM ? 'clearanceNo' : 'roofBox',
      tone: 'hard',
      params: { height: metres(heightMm), withBox: metres(heightMm + ROOF_BOX_MM), limit: metres(CLEARANCE_MM) }
    })
  }
  return tips
}
