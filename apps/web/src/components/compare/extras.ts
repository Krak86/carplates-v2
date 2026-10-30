import { CO2_SCORE_MAX_G_KM, RDW_MIN_DISPLAY_N } from '@carplates/shared'

import { SPEC_ROWS } from '@/components/RdwSpecs.helpers'
import { fitInBay, fitInGarage, GARAGE_REFS, PARKING_REFS } from '@/components/size/fit'
import type { FitVerdict } from '@/components/size/fit'

import { sizeOf } from './rows'
import type { CompareLoaded } from './types'

type Pair<T> = readonly [T | null, T | null]

const both = <T>(loaded: readonly [CompareLoaded, CompareLoaded], pick: (x: CompareLoaded) => T): Pair<T> => [
  pick(loaded[0]),
  pick(loaded[1])
]

export type Range = { min: number; median: number; max: number }

export type Dumbbell = {
  key: string
  /** `rdw.<key>` i18n label. */
  labelKey: string
  unitKey?: string
  decimals: number
  /** The shared axis of both cars and of every measure in the same unit: from zero to the largest value. */
  axisMin: number
  axisMax: number
  ranges: readonly [Range, Range]
  /** The axis is cut to the two cars' span, not zero-based (they would be a sliver on the shared axis). */
  zoomed: boolean
  /** Either range comes from fewer than `RDW_MIN_DISPLAY_N` vehicles. */
  smallSample: boolean
}

const TOW_KEYS: ReadonlySet<string> = new Set(['towBraked', 'towUnbraked'])
/** Both cars together span less than this share of the group axis: zoom that row. */
const ZOOM_SPAN_SHARE = 0.15
/** Margin on each side of a zoomed axis, as a share of the span. */
const ZOOM_PAD = 0.15

/** min - median - max of each RDW measure the two cars share, one row per measure on a common axis. */
export function buildDumbbells(loaded: readonly [CompareLoaded, CompareLoaded]): Dumbbell[] {
  const out: Dumbbell[] = []
  for (const def of SPEC_ROWS) {
    if (!def.unitKey) continue
    const ranges = both(loaded, x => (x.rdw ? def.pick(x.rdw.specs) : null))
    const [a, b] = ranges
    if (!a || !b || a.max === a.min || b.max === b.min) continue
    out.push({
      key: def.key,
      labelKey: `rdw.${def.key}`,
      unitKey: def.unitKey,
      decimals: def.format?.decimals ?? 0,
      axisMin: Math.min(a.min, b.min),
      axisMax: Math.max(a.max, b.max),
      zoomed: false,
      ranges: [a, b],
      smallSample: loaded.some(x => (x.rdw?.specs.n ?? Infinity) < RDW_MIN_DISPLAY_N)
    })
  }
  // Axes start at zero, so the same position always means the same share of the maximum; measures in the same
  // group (the masses, the lengths; towing limits apart from the masses) share one axis, so their lines compare
  // across rows too. A measure whose two cars span only a sliver of that axis (noise, wheelbase) is zoomed instead.
  const groupOf = (d: Dumbbell): string => `${d.unitKey ?? d.key}${TOW_KEYS.has(d.key) ? ':tow' : ''}`
  const axisMax = new Map<string, number>()
  for (const d of out) axisMax.set(groupOf(d), Math.max(axisMax.get(groupOf(d)) ?? 0, d.axisMax))
  return out.map(d => {
    const max = axisMax.get(groupOf(d)) ?? d.axisMax
    const lo = Math.min(d.ranges[0].min, d.ranges[1].min)
    const hi = Math.max(d.ranges[0].max, d.ranges[1].max)
    if (max > 0 && (hi - lo) / max < ZOOM_SPAN_SHARE) {
      const pad = (hi - lo) * ZOOM_PAD
      return { ...d, axisMin: Math.max(0, lo - pad), axisMax: hi + pad, zoomed: true }
    }
    return { ...d, axisMin: 0, axisMax: max, zoomed: false }
  })
}

/** Position 0..1 of `value` on a dumbbell's axis. */
export const axisPosition = (d: Pick<Dumbbell, 'axisMin' | 'axisMax'>, value: number): number =>
  d.axisMax === d.axisMin ? 0.5 : (value - d.axisMin) / (d.axisMax - d.axisMin)

export type CurvePoint = { x: number; y: number }
export type CurveSet = {
  /** One series per car; an empty one means that car has no curve. */
  series: readonly [CurvePoint[], CurvePoint[]]
  xMin: number
  xMax: number
  yMax: number
}

const MIN_CURVE_POINTS = 2

function toCurves(series: readonly [CurvePoint[], CurvePoint[]]): CurveSet | null {
  const usable = series.map(s => (s.length >= MIN_CURVE_POINTS ? s : [])) as unknown as readonly [
    CurvePoint[],
    CurvePoint[]
  ]
  const all = usable.flat()
  if (all.length === 0) return null
  return {
    series: usable,
    xMin: Math.min(...all.map(p => p.x)),
    xMax: Math.max(...all.map(p => p.x)),
    yMax: Math.max(...all.map(p => p.y))
  }
}

/** Median Dutch new price (EUR) by model year of each car's model (real RDW data; thin years are already left out). */
export function priceCurves(loaded: readonly [CompareLoaded, CompareLoaded]): CurveSet | null {
  const line = (x: CompareLoaded): CurvePoint[] =>
    [...(x.rdw?.priceByYear ?? [])].sort((p, q) => p.year - q.year).map(p => ({ x: p.year, y: p.priceEur }))
  return toCurves([line(loaded[0]), line(loaded[1])])
}

/** Share of UK MOT tests failed (percent) per mileage band; x is the band's lower edge in thousand km. A thin band is a gap. */
export function motCurves(loaded: readonly [CompareLoaded, CompareLoaded]): CurveSet | null {
  const line = (x: CompareLoaded): CurvePoint[] =>
    (x.mot?.bands ?? []).flatMap((band, i) =>
      band.failRate == null ? [] : [{ x: Math.round((x.mot?.edgesKm[i] ?? 0) / 1000), y: band.failRate * 100 }]
    )
  return toCurves([line(loaded[0]), line(loaded[1])])
}

export type GanttBar = {
  side: 0 | 1
  label: string
  yearFrom: number
  /** Last production year; the current year when still in production. */
  yearTo: number
  /** The generation of the compared car. */
  current: boolean
  ongoing: boolean
}
export type Gantt = { from: number; to: number; bars: GanttBar[] }

/** Production span of every generation of both models on one year axis; the car's own generation is flagged. */
export function buildGantt(loaded: readonly [CompareLoaded, CompareLoaded], currentYear: number): Gantt | null {
  const bars: GanttBar[] = []
  for (const side of [0, 1] as const) {
    const x = loaded[side]
    const year = x.car?.year ?? null
    for (const g of x.generations ?? []) {
      const yearTo = g.yearTo ?? currentYear
      bars.push({
        side,
        label: g.code || g.label,
        yearFrom: g.yearFrom,
        yearTo,
        current: year != null && g.yearFrom <= year && year <= yearTo,
        ongoing: g.yearTo === null
      })
    }
  }
  if (bars.length === 0) return null
  return {
    from: Math.min(...bars.map(b => b.yearFrom)),
    to: Math.max(...bars.map(b => b.yearTo)),
    bars
  }
}

export type StarRow = { id: 'ncap' | 'nhtsa'; stars: Pair<number> }

/** Star scores of the two programmes the compare page loads (Euro NCAP overall, NHTSA mean of the matching trims). */
export function buildStarRows(loaded: readonly [CompareLoaded, CompareLoaded]): StarRow[] {
  const rows: StarRow[] = [
    { id: 'ncap', stars: both(loaded, x => x.euroNcap?.stars ?? null) },
    { id: 'nhtsa', stars: both(loaded, x => x.nhtsaStars) }
  ]
  return rows.filter(r => r.stars.some(s => s !== null))
}

/** Boundaries of the green / yellow / orange / red CO2 bands in g/km (score 25 / 50 / 75 of `CO2_SCORE_MAX_G_KM`). */
export const CO2_SCALE_LIMITS = [25, 50, 75].map(score => (score / 100) * CO2_SCORE_MAX_G_KM)

export type Co2Marks = { max: number; values: Pair<number> }

/** Median WLTP / NEDC CO2 of each car on the shared scale; null when neither has one. */
export function buildCo2Marks(loaded: readonly [CompareLoaded, CompareLoaded]): Co2Marks | null {
  const values = both(loaded, x => x.rdw?.specs.co2GKm?.median ?? null)
  if (values.every(v => v === null)) return null
  return { max: CO2_SCORE_MAX_G_KM, values }
}

export type FitRow = {
  kind: 'bay' | 'garage'
  /** `size.bay.<id>` / `size.garage.<id>`. */
  id: string
  verdicts: Pair<FitVerdict>
}

/** Does each car fit the reference parking places and garages; the same helpers and verdicts as "Size & parking". */
export function buildFitRows(loaded: readonly [CompareLoaded, CompareLoaded]): FitRow[] {
  const dims = both(loaded, x => sizeOf(x)?.dims ?? null)
  if (dims.every(d => d === null)) return []
  const bay = PARKING_REFS.map(ref => ({
    kind: 'bay' as const,
    id: ref.id,
    verdicts: dims.map(d => (d ? fitInBay(d, ref.widthMm, ref.lengthMm).verdict : null)) as unknown as Pair<FitVerdict>
  }))
  const garage = GARAGE_REFS.map(ref => ({
    kind: 'garage' as const,
    id: ref.id,
    verdicts: dims.map(d => (d ? fitInGarage(d, ref).verdict : null)) as unknown as Pair<FitVerdict>
  }))
  return [...bay, ...garage]
}
