import type { RdwMatchInfo } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { coverageOf } from './coverage'
import { formatCompareValue, formatWithUnit } from './format'
import type { FormatContext } from './format'
import { COMPARE_GROUPS } from './types'
import type { CompareGroup, CompareLoaded, CompareRow } from './types'
import { betterSide, buildCompareRows, hasAnyValue, isSame, overallFailRate, pruneRows } from './rows'

const t = (key: string): string => key
const NOW = 2026

const range = (median: number): { min: number; median: number; max: number } => ({
  min: median,
  median,
  max: median
})

/** An RDW match with only the measures a test names (the rest of the contract is optional or absent). */
function rdw(specs: Record<string, unknown>, n = 500, extra: Record<string, unknown> = {}): RdwMatchInfo {
  const base = { year: 2015, n, powerKw: null, displacementCc: null, massKg: null, co2GKm: null }
  const ranged = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, typeof v === 'number' ? range(v) : v]))
  return {
    makeName: 'X',
    modelName: 'Y',
    how: 'exact',
    crossMake: false,
    exactYear: true,
    specs: { ...base, ...ranged },
    ...extra
  } as unknown as RdwMatchInfo
}

const car = (over: Partial<NonNullable<CompareLoaded['car']>> = {}): NonNullable<CompareLoaded['car']> => ({
  ref: { kind: 'plate', plate: 'АА1234ВВ' },
  brand: 'BMW',
  model: '320',
  year: 2015,
  kind: 'ЛЕГКОВИЙ',
  fuel: 'ДИЗЕЛЬНЕ ПАЛИВО',
  capacity: 1995,
  powerKw: null,
  body: 'СЕДАН',
  ownWeight: null,
  totalWeight: null,
  exact: null,
  ...over
})

const loaded = (over: Partial<CompareLoaded> = {}): CompareLoaded => ({
  car: car(),
  rdw: null,
  wiki: null,
  euroNcap: null,
  nhtsaStars: null,
  rdwRecalls: null,
  nhtsaRecalls: null,
  nhtsaComplaints: null,
  motFailRate: null,
  catalog: null,
  ...over
})

const ALL_SETTLED = Object.fromEntries(COMPARE_GROUPS.map(g => [g, true])) as Record<CompareGroup, boolean>

const rowOf = (rows: readonly CompareRow[], id: string): CompareRow => {
  const found = rows.find(r => r.id === id)
  if (!found) throw new Error(`no row ${id}`)
  return found
}

describe('buildCompareRows', () => {
  it('reads the RDW spec rows through SPEC_ROWS, with the right direction', () => {
    const a = loaded({ rdw: rdw({ powerKw: 140, massKg: 1500, co2GKm: 120, towBrakedKg: 1800 }) })
    const b = loaded({ rdw: rdw({ powerKw: 110, massKg: 1400, co2GKm: 150, towBrakedKg: 1500 }) })
    const rows = buildCompareRows(a, b, t, NOW)

    expect(rowOf(rows, 'power')).toMatchObject({ values: [140, 110], direction: 'higher', group: 'engine' })
    expect(rowOf(rows, 'mass')).toMatchObject({ values: [1500, 1400], direction: 'lower', group: 'size' })
    expect(rowOf(rows, 'co2')).toMatchObject({ values: [120, 150], direction: 'lower', group: 'economy' })
    expect(rowOf(rows, 'towBraked')).toMatchObject({ direction: 'higher' })
  })

  it('shows a one-sided gap as null on the side without data', () => {
    const rows = buildCompareRows(loaded({ rdw: rdw({ powerKw: 140 }) }), loaded(), t, NOW)
    expect(rowOf(rows, 'power').values).toEqual([140, null])
  })

  it('skips electric rows for a combustion car and combustion rows for an EV', () => {
    const specs = { powerKw: 100, co2GKm: 120, consumptionL100: 5.5, evRangeKm: 400, evKwh100: 16 }
    const diesel = loaded({ rdw: rdw(specs) })
    const ev = loaded({ car: car({ fuel: 'ЕЛЕКТРО' }), rdw: rdw(specs) })
    const rows = buildCompareRows(diesel, ev, t, NOW)

    expect(rowOf(rows, 'co2').values).toEqual([120, null])
    expect(rowOf(rows, 'consumption').values).toEqual([5.5, null])
    expect(rowOf(rows, 'evRange').values).toEqual([null, 400])
    expect(rowOf(rows, 'evKwh').values).toEqual([null, 16])
  })

  it('takes the outer sizes from the merged size (cm), and never from a forecast', () => {
    const a = loaded({ rdw: rdw({ lengthCm: 463, widthCm: 180, heightCm: 144, wheelbaseCm: 281 }) })
    const rows = buildCompareRows(a, loaded(), t, NOW)
    expect(rowOf(rows, 'length').values).toEqual([463, null])
    expect(rowOf(rows, 'length').direction).toBe('neutral')
    // Side B has no figure at all: its sizes are a typical-shape forecast, which is left as a gap.
    expect(rowOf(rows, 'wheelbase').values[1]).toBeNull()
  })

  it('fills the kerb mass from Wikipedia when RDW has none', () => {
    const wiki = { dimensions: { kerbKg: 1450 } } as unknown as CompareLoaded['wiki']
    const rows = buildCompareRows(loaded({ wiki }), loaded({ rdw: rdw({ kerbMassKg: 1500 }) }), t, NOW)
    expect(rowOf(rows, 'kerbMass').values).toEqual([1450, 1500])
  })

  it('derives power to weight from the typical power and kerb (else unladen) mass', () => {
    const a = loaded({ rdw: rdw({ powerKw: 150, kerbMassKg: 1500 }) })
    const b = loaded({ rdw: rdw({ powerKw: 100, massKg: 1250 }) })
    expect(rowOf(buildCompareRows(a, b, t, NOW), 'powerToWeight').values).toEqual([100, 80])
  })

  it('flags a thin RDW sample', () => {
    const thin = loaded({ rdw: rdw({ powerKw: 100 }, 4) })
    const rows = buildCompareRows(thin, loaded({ rdw: rdw({ powerKw: 90 }) }), t, NOW)
    expect(rowOf(rows, 'power').smallSample).toBe(true)
    expect(rowOf(rows, 'topSpeed').smallSample).toBeUndefined()
  })

  it('rounds the RDW price to its step and adds the value estimate', () => {
    const estimate = { midEur: 12_345, lowEur: 10_000, highEur: 14_000, ageYears: 11, retained: 0.3 }
    const a = loaded({ rdw: rdw({ priceEur: 41_234 }, 500, { valueEstimate: estimate }) })
    const rows = buildCompareRows(a, loaded(), t, NOW)
    expect(rowOf(rows, 'price').values).toEqual([41_200, null])
    expect(rowOf(rows, 'valueEstimate').values).toEqual([12_300, null])
    expect(rowOf(rows, 'valueEstimate').direction).toBe('lower')
  })

  it('puts safety, reliability and Ukraine figures in their groups', () => {
    const a = loaded({
      euroNcap: { stars: 5, adultOccupantPct: 95 } as CompareLoaded['euroNcap'],
      nhtsaStars: 4.66,
      rdwRecalls: 3,
      motFailRate: 0.234,
      catalog: {
        n: 1200,
        yearMin: 2000,
        yearMax: 2020,
        stats: { fuel: [['БЕНЗИН', 5]], body: [], color: [], regions: [['Київ', 3]] }
      } as unknown as CompareLoaded['catalog']
    })
    const rows = buildCompareRows(a, loaded(), t, NOW)
    expect(rowOf(rows, 'ncapStars')).toMatchObject({ values: [5, null], group: 'safety', direction: 'higher' })
    expect(rowOf(rows, 'nhtsaStars').values).toEqual([4.7, null])
    expect(rowOf(rows, 'rdwRecalls')).toMatchObject({ values: [3, null], group: 'reliability', direction: 'neutral' })
    expect(rowOf(rows, 'motFailRate').values).toEqual([23.4, null])
    expect(rowOf(rows, 'ukCars').values).toEqual([1200, null])
    expect(rowOf(rows, 'ukYears').values).toEqual(['2000–2020', null])
    expect(rowOf(rows, 'ukFuel').values).toEqual(['БЕНЗИН', null])
  })

  it('keeps this-exact-car rows apart and leaves a model ref empty there', () => {
    const exact = {
      plate: 'АА1234ВВ',
      vin: null,
      year: 2016,
      color: 'ЧОРНИЙ',
      region: 'Київ',
      registeredYear: 2021,
      ownersCount: 2,
      historyCount: 4,
      operName: 'ПЕРВИННА РЕЄСТРАЦІЯ',
      everImported: true,
      capacity: 1995,
      powerKw: null,
      ownWeight: 1490,
      totalWeight: null
    }
    const rows = buildCompareRows(loaded({ car: car({ exact }) }), loaded(), t, NOW)
    const exactRows = rows.filter(r => r.group === 'exact')
    expect(exactRows.length).toBeGreaterThan(5)
    expect(rowOf(rows, 'exact.ownersCount').values).toEqual([2, null])
    expect(rowOf(rows, 'exact.everImported').values).toEqual([true, null])
    expect(JSON.stringify(rows)).not.toContain('person')
  })
})

describe('pruneRows', () => {
  const rows = buildCompareRows(
    loaded({ rdw: rdw({ powerKw: 140, massKg: 1500 }) }),
    loaded({ rdw: rdw({ powerKw: 110 }) }),
    t,
    NOW
  )

  it('drops rows neither car has and keeps one-sided ones', () => {
    const { sections } = pruneRows(rows, ALL_SETTLED)
    const ids = sections.flatMap(s => s.rows.map(r => r.id))
    expect(ids).toContain('power')
    expect(ids).toContain('mass')
    expect(ids).not.toContain('topSpeed')
    expect(sections.every(s => s.rows.every(hasAnyValue))).toBe(true)
  })

  it('counts every dropped row of a settled group', () => {
    const { sections, hidden } = pruneRows(rows, ALL_SETTLED)
    const kept = sections.reduce((n, s) => n + s.rows.length, 0)
    expect(hidden).toBe(rows.length - kept)
    expect(hidden).toBeGreaterThan(0)
  })

  it('omits a settled group with nothing left', () => {
    const { sections } = pruneRows(rows, ALL_SETTLED)
    expect(sections.map(s => s.group)).not.toContain('safety')
    expect(sections.map(s => s.group)).not.toContain('exact')
  })

  it('returns an unsettled group as pending with no rows, and does not count it as hidden', () => {
    const { sections, hidden } = pruneRows(rows, { ...ALL_SETTLED, engine: false })
    const engine = sections.find(s => s.group === 'engine')
    expect(engine).toEqual({ group: 'engine', rows: [], pending: true })

    const settledOnly = pruneRows(
      rows.filter(r => r.group !== 'engine'),
      ALL_SETTLED
    )
    expect(hidden).toBe(settledOnly.hidden)
  })

  it('keeps the groups in display order', () => {
    const order = pruneRows(rows, ALL_SETTLED).sections.map(s => COMPARE_GROUPS.indexOf(s.group))
    expect(order).toEqual([...order].sort((x, y) => x - y))
  })
})

describe('betterSide / isSame', () => {
  const row = (direction: CompareRow['direction'], values: CompareRow['values']): CompareRow => ({
    id: 'x',
    group: 'engine',
    labelKey: 'x',
    values,
    valueKind: 'number',
    direction,
    source: 'rdw'
  })

  it('names the better side only where the direction is unambiguous', () => {
    expect(betterSide(row('higher', [140, 110]))).toBe(0)
    expect(betterSide(row('lower', [140, 110]))).toBe(1)
    expect(betterSide(row('neutral', [140, 110]))).toBeNull()
  })

  it('names nobody on a tie, a gap or text', () => {
    expect(betterSide(row('higher', [100, 100]))).toBeNull()
    expect(betterSide(row('higher', [100, null]))).toBeNull()
    expect(betterSide(row('higher', ['a', 'b']))).toBeNull()
  })

  it('tells equal rows apart', () => {
    expect(isSame(row('higher', [1, 1]))).toBe(true)
    expect(isSame(row('higher', [1, 2]))).toBe(false)
  })
})

describe('overallFailRate', () => {
  it('weights each band by its tests and ignores bands under the sample floor', () => {
    expect(
      overallFailRate([
        { tests: 1000, failRate: 0.1 },
        { tests: 3000, failRate: 0.3 },
        { tests: 50, failRate: null }
      ])
    ).toBeCloseTo(0.25)
  })

  it('is null without a rated band', () => {
    expect(overallFailRate([{ tests: 10, failRate: null }])).toBeNull()
    expect(overallFailRate([])).toBeNull()
  })
})

describe('coverageOf', () => {
  it('marks only the sources that matched', () => {
    expect(coverageOf(loaded({ rdw: rdw({}), rdwRecalls: 0 }))).toEqual({
      registry: false,
      rdw: true,
      wiki: false,
      safety: false,
      mot: false,
      recalls: true
    })
  })

  it('counts a plate or VIN as registry data', () => {
    const exact = { plate: null } as unknown as NonNullable<CompareLoaded['car']>['exact']
    expect(coverageOf(loaded({ car: car({ exact }) })).registry).toBe(true)
  })
})

describe('formatCompareValue', () => {
  const ctx: FormatContext = { locale: 'en-US', lang: 'en', t, regionLabel: n => `region:${n}` }

  it('prints a gap as a plain hyphen', () => {
    expect(formatCompareValue({ valueKind: 'number' }, null, ctx)).toBe('-')
  })

  it('formats numbers, decimals and percentages', () => {
    expect(formatCompareValue({ valueKind: 'number' }, 12_345, ctx)).toBe('12,345')
    expect(formatCompareValue({ valueKind: 'number', decimals: 1 }, 5, ctx)).toBe('5.0')
    expect(formatCompareValue({ valueKind: 'percent' }, 23, ctx)).toBe('23%')
  })

  it('localizes registry words and regions, and adds the unit', () => {
    expect(formatCompareValue({ valueKind: 'fuel' }, 'ДИЗЕЛЬНЕ ПАЛИВО', ctx)).toBe('diesel')
    expect(formatCompareValue({ valueKind: 'region' }, 'Київ', ctx)).toBe('region:Київ')
    expect(formatWithUnit({ valueKind: 'number', unitKey: 'rdw.unitKw' }, 140, ctx)).toBe('140 rdw.unitKw')
    expect(formatWithUnit({ valueKind: 'number', unitKey: 'rdw.unitKw' }, null, ctx)).toBe('-')
  })

  it('prints a boolean as yes or a gap', () => {
    expect(formatCompareValue({ valueKind: 'bool' }, true, ctx)).toBe('compare.yes')
    expect(formatCompareValue({ valueKind: 'bool' }, false, ctx)).toBe('-')
  })
})
