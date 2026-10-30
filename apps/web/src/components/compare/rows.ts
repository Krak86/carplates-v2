import { CURATED_YEAR_FROM, RDW_MIN_DISPLAY_N } from '@carplates/shared'

import { ukrPrice } from '@/components/EstimatedValue.helpers'
import { appliesToFuel, SPEC_ROWS, type SpecRowDef } from '@/components/RdwSpecs.helpers'
import { computeVehicleSize } from '@/components/size/use-vehicle-size'
import { engineMatchesCar, formatEngine } from '@/components/WikiSpecs.helpers'

import { COMPARE_GROUPS } from './types'
import type { CompareGroup, CompareLoaded, CompareRow, CompareValue } from './types'

type Translate = (key: string, options?: Record<string, unknown>) => string
type Side = readonly [CompareLoaded, CompareLoaded]
type Direction = CompareRow['direction']

/** Which side is better, where that is unambiguous (a lower price, a heavier tow limit). Dimensions stay neutral. */
const SPEC_DIRECTION: Readonly<Partial<Record<SpecRowDef['key'], Direction>>> = {
  power: 'higher',
  topSpeed: 'higher',
  consumption: 'lower',
  evKwh: 'lower',
  evRange: 'higher',
  co2: 'lower',
  noise: 'lower',
  mass: 'lower',
  kerbMass: 'lower',
  towBraked: 'higher',
  towUnbraked: 'higher',
  seats: 'higher',
  price: 'lower',
  priceExTax: 'lower',
  bpm: 'lower'
}

/** Spec group of the RDW block to the compare group it sits in. */
const SPEC_GROUP: Readonly<Record<SpecRowDef['group'], CompareGroup | null>> = {
  engine: 'engine',
  economy: 'economy',
  mass: 'size',
  body: 'size',
  price: 'price',
  // Fuel mix, colours and body types of the Dutch fleet are shares, not figures: not a row here.
  fleet: null
}

/** The outer sizes come from `computeVehicleSize` (RDW, then Wikipedia, then VIN), so the rows here skip RDW's own. */
const SIZE_SPEC_KEYS: ReadonlySet<SpecRowDef['key']> = new Set(['length', 'width', 'height', 'wheelbase'])

const DIMENSIONS = [
  { id: 'length', field: 'lengthMm' },
  { id: 'width', field: 'widthMm' },
  { id: 'height', field: 'heightMm' },
  { id: 'wheelbase', field: 'wheelbaseMm' }
] as const

const both = <T>(side: Side, pick: (x: CompareLoaded) => T): readonly [T, T] => [pick(side[0]), pick(side[1])]

const roundTo = (value: number, step: number): number => Math.round(value / step) * step

/** `[label, count]` rows to the biggest label. */
const top = (rows: readonly (readonly [string, number])[] | undefined): string | null => rows?.[0]?.[0] ?? null

type RowInit = Pick<CompareRow, 'id' | 'group' | 'labelKey' | 'values' | 'valueKind' | 'source'> & Partial<CompareRow>

/** A row with the defaults every row shares: no winner unless the caller names a direction. */
const row = (init: RowInit): CompareRow => ({ direction: 'neutral', ...init })

/** The typical figure of an RDW measure for a car, or null when the measure does not apply to its fuel / RDW has none. */
function specValue(def: SpecRowDef, x: CompareLoaded): number | null {
  const median = x.rdw ? (def.pick(x.rdw.specs)?.median ?? null) : null
  if (median == null || !appliesToFuel(def.powertrain, x.car?.fuel)) return null
  return def.format?.step ? roundTo(median, def.format.step) : median
}

/** The MOT fail rate of the whole model: the bands' rates weighted by their tests (a band under the sample floor is null). */
export function overallFailRate(bands: readonly { tests: number; failRate: number | null }[]): number | null {
  const rated = bands.filter(b => b.failRate != null)
  const tests = rated.reduce((sum, b) => sum + b.tests, 0)
  return tests > 0 ? rated.reduce((sum, b) => sum + b.tests * (b.failRate as number), 0) / tests : null
}

const sizeOf = (x: CompareLoaded): ReturnType<typeof computeVehicleSize> =>
  x.car ? computeVehicleSize({ rdw: x.rdw, wiki: x.wiki, kind: x.car.kind, body: x.car.body }) : null

function overviewRows(side: Side, t: Translate): CompareRow[] {
  const production = (x: CompareLoaded): string | null =>
    x.wiki && x.wiki.yearFrom !== CURATED_YEAR_FROM
      ? `${x.wiki.yearFrom}–${x.wiki.yearTo ?? t('generation.present')}`
      : null
  const sizeClass = both(side, x => sizeOf(x)?.cls?.cls ?? null)
  const base = { group: 'overview', valueKind: 'text' } as const
  return [
    row({
      ...base,
      id: 'year',
      labelKey: 'compare.row.year',
      values: both(side, x => (x.car?.year ? String(x.car.year) : null)),
      source: 'registry'
    }),
    row({
      ...base,
      id: 'fuel',
      labelKey: 'compare.row.fuel',
      values: both(side, x => x.car?.fuel ?? null),
      valueKind: 'fuel',
      source: 'registry'
    }),
    row({
      ...base,
      id: 'body',
      labelKey: 'compare.row.body',
      values: both(side, x => x.car?.body ?? null),
      valueKind: 'body',
      source: 'registry'
    }),
    row({
      ...base,
      id: 'generation',
      labelKey: 'compare.row.generation',
      values: both(side, x => x.wiki?.generationLabel ?? x.wiki?.generationCode ?? null),
      source: 'wiki'
    }),
    row({
      ...base,
      id: 'production',
      labelKey: 'compare.row.production',
      values: both(side, production),
      source: 'wiki'
    }),
    row({
      ...base,
      id: 'sizeClass',
      labelKey: 'compare.row.sizeClass',
      values: sizeClass,
      source: 'rdw',
      aboutKey: 'compare.about.sizeClass'
    })
  ]
}

function specRows(side: Side, group: CompareGroup): CompareRow[] {
  return SPEC_ROWS.filter(def => SPEC_GROUP[def.group] === group && !SIZE_SPEC_KEYS.has(def.key)).map(def => {
    const thin = side.some(x => !!x.rdw && !!def.pick(x.rdw.specs) && x.rdw.specs.n < RDW_MIN_DISPLAY_N)
    return row({
      id: def.key,
      group,
      labelKey: `rdw.${def.key}`,
      unitKey: def.unitKey,
      values: both(side, x => specValue(def, x)),
      valueKind: 'number',
      direction: SPEC_DIRECTION[def.key] ?? 'neutral',
      source: 'rdw',
      aboutKey: `rdw.about.${def.key}`,
      ...(def.format?.decimals ? { decimals: def.format.decimals } : {}),
      ...(thin ? { smallSample: true } : {})
    })
  })
}

function engineRows(side: Side, t: Translate): CompareRow[] {
  const rows = specRows(side, 'engine')
  const kw = rows.find(r => r.id === 'power')?.values ?? [null, null]
  const perTonne = [0, 1].map(i => {
    const specs = side[i]?.rdw?.specs
    const mass = specs?.kerbMassKg?.median ?? specs?.massKg?.median ?? null
    const power = kw[i]
    return typeof power === 'number' && mass ? Math.round((power / mass) * 1000) : null
  }) as [number | null, number | null]
  const engine = (x: CompareLoaded): string | null => {
    const own = {
      fuel: x.car?.fuel,
      displacementCc: x.car?.capacity,
      powerKw: x.car?.powerKw,
      massKg: x.car?.ownWeight
    }
    const found = x.wiki?.engines?.find(e => engineMatchesCar(e, own))
    return found ? formatEngine(found, t) : null
  }
  return [
    ...rows,
    row({
      id: 'powerToWeight',
      group: 'engine',
      labelKey: 'compare.row.powerToWeight',
      unitKey: 'compare.unit.kwPerTonne',
      values: perTonne,
      valueKind: 'number',
      direction: 'higher',
      source: 'rdw',
      aboutKey: 'compare.about.powerToWeight'
    }),
    row({
      id: 'engineCatalogue',
      group: 'engine',
      labelKey: 'compare.row.engineCatalogue',
      values: both(side, engine),
      valueKind: 'text',
      source: 'wiki',
      aboutKey: 'compare.about.engineCatalogue'
    })
  ]
}

function sizeRows(side: Side): CompareRow[] {
  const sizes = both(side, sizeOf)
  // A forecast ("about the typical shape") is not data we hold for this model: leave the gap.
  const cm = (i: 0 | 1, field: (typeof DIMENSIONS)[number]['field']): number | null => {
    const figure = sizes[i]?.figures[field]
    return figure && figure.source !== 'estimate' ? Math.round(figure.value / 10) : null
  }
  const dims = DIMENSIONS.map(d =>
    row({
      id: d.id,
      group: 'size',
      labelKey: `rdw.${d.id}`,
      unitKey: 'rdw.unitCm',
      values: [cm(0, d.field), cm(1, d.field)],
      valueKind: 'number',
      source: 'rdw',
      aboutKey: `rdw.about.${d.id}`
    })
  )
  const rest = specRows(side, 'size').map(r => {
    if (r.id !== 'kerbMass') return r
    // Wikipedia's kerb mass fills the row where RDW has none.
    const wiki = both(side, x => x.wiki?.dimensions?.kerbKg ?? null)
    return { ...r, values: [r.values[0] ?? wiki[0], r.values[1] ?? wiki[1]] as const }
  })
  return [...dims, ...rest]
}

function priceRows(side: Side, nowYear: number): CompareRow[] {
  const estimate = (x: CompareLoaded): NonNullable<CompareLoaded['rdw']>['valueEstimate'] =>
    x.rdw?.valueEstimate ?? null
  const ukrTotal = (x: CompareLoaded): number | null => {
    const e = estimate(x)
    if (!x.rdw || !e || !x.car?.year) return null
    const price = ukrPrice(x.rdw, e, { fuel: x.car.fuel, capacityCc: x.car.capacity, makeYear: x.car.year }, nowYear)
    return price.mid.exciseKnown ? roundTo(price.mid.totalEur, 100) : null
  }
  const rough = side.some(x => !!estimate(x)?.rough)
  return [
    ...specRows(side, 'price'),
    row({
      id: 'valueEstimate',
      group: 'price',
      labelKey: 'compare.row.valueEstimate',
      unitKey: 'rdw.unitEur',
      values: both(side, x => {
        const e = estimate(x)
        return e ? roundTo(e.midEur, 100) : null
      }),
      valueKind: 'number',
      direction: 'lower',
      source: 'rdw',
      aboutKey: 'compare.about.valueEstimate',
      ...(rough ? { smallSample: true } : {})
    }),
    row({
      id: 'ukrTotal',
      group: 'price',
      labelKey: 'compare.row.ukrTotal',
      unitKey: 'rdw.unitEur',
      values: both(side, ukrTotal),
      valueKind: 'number',
      direction: 'lower',
      source: 'rdw',
      aboutKey: 'compare.about.ukrTotal'
    })
  ]
}

function safetyRows(side: Side): CompareRow[] {
  const programme = (
    id: string,
    pick: (x: CompareLoaded) => number | null,
    extra: Partial<CompareRow> = {}
  ): CompareRow =>
    row({
      id,
      group: 'safety',
      labelKey: `compare.row.${id}`,
      values: both(side, pick),
      valueKind: 'number',
      direction: 'higher',
      source: 'safety',
      ...extra
    })
  return [
    programme('ncapStars', x => x.euroNcap?.stars ?? null),
    programme('ncapAdult', x => x.euroNcap?.adultOccupantPct ?? null, { valueKind: 'percent' }),
    programme('ncapChild', x => x.euroNcap?.childOccupantPct ?? null, { valueKind: 'percent' }),
    programme('ncapVru', x => x.euroNcap?.vulnerableRoadUsersPct ?? null, { valueKind: 'percent' }),
    programme('ncapAssist', x => x.euroNcap?.safetyAssistPct ?? null, { valueKind: 'percent' }),
    programme('nhtsaStars', x => (x.nhtsaStars == null ? null : Math.round(x.nhtsaStars * 10) / 10), { decimals: 1 })
  ]
}

function reliabilityRows(side: Side): CompareRow[] {
  // Campaign and complaint counts follow the size of the fleet, so they are shown but never called better or worse.
  const count = (
    id: string,
    pick: (x: CompareLoaded) => number | null,
    source: CompareRow['source'],
    extra: Partial<CompareRow> = {}
  ): CompareRow =>
    row({
      id,
      group: 'reliability',
      labelKey: `compare.row.${id}`,
      values: both(side, pick),
      valueKind: 'number',
      source,
      aboutKey: `compare.about.${id}`,
      ...extra
    })
  return [
    count('rdwRecalls', x => x.rdwRecalls, 'recalls'),
    count('nhtsaRecalls', x => x.nhtsaRecalls, 'recalls'),
    count('nhtsaComplaints', x => x.nhtsaComplaints, 'recalls'),
    count('motFailRate', x => (x.motFailRate == null ? null : Math.round(x.motFailRate * 1000) / 10), 'mot', {
      valueKind: 'percent'
    })
  ]
}

function ukraineRows(side: Side): CompareRow[] {
  const line = (
    id: string,
    pick: (x: CompareLoaded) => CompareValue,
    valueKind: CompareRow['valueKind'],
    extra: Partial<CompareRow> = {}
  ): CompareRow =>
    row({
      id,
      group: 'ukraine',
      labelKey: `compare.row.${id}`,
      values: both(side, pick),
      valueKind,
      source: 'registry',
      ...extra
    })
  const years = (x: CompareLoaded): string | null =>
    x.catalog?.yearMin && x.catalog.yearMax ? `${x.catalog.yearMin}–${x.catalog.yearMax}` : null
  return [
    line('ukCars', x => x.catalog?.n ?? null, 'number', { aboutKey: 'compare.about.ukCars' }),
    line('ukYears', years, 'text'),
    line('ukFuel', x => top(x.catalog?.stats.fuel), 'fuel'),
    line('ukBody', x => top(x.catalog?.stats.body), 'body'),
    line('ukColor', x => top(x.catalog?.stats.color), 'color'),
    line('ukRegion', x => top(x.catalog?.stats.regions), 'region')
  ]
}

type Exact = NonNullable<NonNullable<CompareLoaded['car']>['exact']>

/** This exact car: only a plate or a VIN has these, a model ref leaves its side empty. */
function exactRows(side: Side): CompareRow[] {
  const line = (
    id: string,
    pick: (e: Exact) => CompareValue,
    valueKind: CompareRow['valueKind'],
    unitKey?: string
  ): CompareRow =>
    row({
      id: `exact.${id}`,
      group: 'exact',
      labelKey: `compare.row.exact.${id}`,
      unitKey,
      values: both(side, x => (x.car?.exact ? pick(x.car.exact) : null)),
      valueKind,
      source: 'registry'
    })
  return [
    line('year', e => (e.year ? String(e.year) : null), 'text'),
    line('color', e => e.color, 'color'),
    line('region', e => e.region, 'region'),
    line('registeredYear', e => (e.registeredYear ? String(e.registeredYear) : null), 'text'),
    line('ownersCount', e => e.ownersCount, 'number'),
    line('historyCount', e => e.historyCount, 'number'),
    line('operName', e => e.operName, 'text'),
    line('everImported', e => (e.everImported ? true : null), 'bool'),
    line('capacity', e => e.capacity, 'number', 'rdw.unitCc'),
    line('powerKw', e => e.powerKw, 'number', 'rdw.unitKw'),
    line('ownWeight', e => e.ownWeight, 'number', 'field.unitKg'),
    line('totalWeight', e => e.totalWeight, 'number', 'field.unitKg')
  ]
}

/** Every comparable row of the two cars in display order, nothing pruned yet (`pruneRows` does that). */
export function buildCompareRows(a: CompareLoaded, b: CompareLoaded, t: Translate, nowYear: number): CompareRow[] {
  const side: Side = [a, b]
  return [
    ...overviewRows(side, t),
    ...engineRows(side, t),
    ...sizeRows(side),
    ...specRows(side, 'economy'),
    ...priceRows(side, nowYear),
    ...safetyRows(side),
    ...reliabilityRows(side),
    ...ukraineRows(side),
    ...exactRows(side)
  ]
}

export type CompareSection = {
  group: CompareGroup
  rows: CompareRow[]
  /** The group's queries have not settled: show a skeleton, not rows that may still appear. */
  pending: boolean
}

export type Pruned = {
  sections: CompareSection[]
  /** Rows dropped because neither car has a value (settled groups only). */
  hidden: number
}

/** Neither car has a value: not a comparison, skipped. A one-sided gap stays (it shows "-"). */
export const hasAnyValue = (r: CompareRow): boolean => r.values.some(v => v !== null)

/** The two values are the same figure (used by the "differences only" switch). */
export const isSame = (r: CompareRow): boolean => r.values[0] === r.values[1]

/** 0 / 1 = the side that is better, null where there is no unambiguous winner (neutral, a gap, a tie, not numbers). */
export function betterSide(r: CompareRow): 0 | 1 | null {
  const [x, y] = r.values
  if (r.direction === 'neutral' || typeof x !== 'number' || typeof y !== 'number' || x === y) return null
  return (r.direction === 'higher' ? x > y : x < y) ? 0 : 1
}

/**
 * Groups the rows, dropping those neither car has data for. A group whose queries are still running is returned
 * `pending` with no rows (so nothing pops in and out); a settled group with no row left disappears.
 */
export function pruneRows(rows: readonly CompareRow[], settled: Readonly<Record<CompareGroup, boolean>>): Pruned {
  let hidden = 0
  const sections: CompareSection[] = []
  for (const group of COMPARE_GROUPS) {
    const inGroup = rows.filter(r => r.group === group)
    if (!settled[group]) {
      if (inGroup.length > 0) sections.push({ group, rows: [], pending: true })
      continue
    }
    const kept = inGroup.filter(hasAnyValue)
    hidden += inGroup.length - kept.length
    if (kept.length > 0) sections.push({ group, rows: kept, pending: false })
  }
  return { sections, hidden }
}
