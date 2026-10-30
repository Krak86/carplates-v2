import { describe, expect, it } from 'vitest'

import { buildCo2Marks, buildDumbbells, buildGantt, buildStarRows, motCurves, priceCurves } from './extras'
import type { CompareLoaded } from './types'

const empty = (over: Partial<CompareLoaded> = {}): CompareLoaded => ({
  car: null,
  rdw: null,
  wiki: null,
  euroNcap: null,
  nhtsaStars: null,
  rdwRecalls: null,
  nhtsaRecalls: null,
  nhtsaComplaints: null,
  motFailRate: null,
  mot: null,
  generations: null,
  catalog: null,
  ...over
})

const rdwWith = (specs: Record<string, unknown>, priceByYear?: { year: number; priceEur: number }[]) =>
  ({ specs: { n: 500, ...specs }, priceByYear }) as unknown as NonNullable<CompareLoaded['rdw']>

describe('buildDumbbells', () => {
  it('needs a real range for both cars and shares one axis', () => {
    const a = empty({ rdw: rdwWith({ powerKw: { min: 60, median: 80, max: 100 } }) })
    const b = empty({ rdw: rdwWith({ powerKw: { min: 90, median: 120, max: 150 } }) })
    const [power] = buildDumbbells([a, b])
    expect(power).toMatchObject({ key: 'power', axisMin: 60, axisMax: 150 })
    expect(buildDumbbells([a, empty()])).toEqual([])
  })
})

describe('curves', () => {
  it('draws a price line only from two points and none when neither car has one', () => {
    const a = empty({
      rdw: rdwWith({}, [
        { year: 2018, priceEur: 20000 },
        { year: 2016, priceEur: 18000 }
      ])
    })
    const b = empty({ rdw: rdwWith({}, [{ year: 2020, priceEur: 30000 }]) })
    const set = priceCurves([a, b])
    expect(set?.series[0].map(p => p.x)).toEqual([2016, 2018])
    expect(set?.series[1]).toEqual([])
    expect(priceCurves([empty(), empty()])).toBeNull()
  })

  it('leaves a MOT band with too few tests as a gap', () => {
    const mot = {
      edgesKm: [0, 50000, 100000],
      bands: [
        { tests: 10, failRate: 0.2 },
        { tests: 1, failRate: null },
        { tests: 10, failRate: 0.4 }
      ]
    } as unknown as CompareLoaded['mot']
    const set = motCurves([empty({ mot }), empty()])
    expect(set?.series[0]).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 40 }
    ])
  })
})

describe('buildGantt', () => {
  it('flags the generation of the car and closes an ongoing one at the current year', () => {
    const gen = (code: string, yearFrom: number, yearTo: number | null) => ({
      code,
      label: code,
      yearFrom,
      yearTo
    })
    const a = empty({
      car: { year: 2015 } as CompareLoaded['car'],
      generations: [gen('Mk6', 2008, 2012), gen('Mk7', 2013, 2019), gen('Mk8', 2020, null)]
    })
    const gantt = buildGantt([a, empty()], 2026)
    expect(gantt?.bars.filter(b => b.current).map(b => b.label)).toEqual(['Mk7'])
    expect(gantt?.to).toBe(2026)
    expect(buildGantt([empty(), empty()], 2026)).toBeNull()
  })
})

describe('stars and CO2', () => {
  it('lists only the programmes one car has and places CO2 on the shared scale', () => {
    const a = empty({ nhtsaStars: 4.5, rdw: rdwWith({ co2GKm: { min: 100, median: 120, max: 140 } }) })
    expect(buildStarRows([a, empty()]).map(r => r.id)).toEqual(['nhtsa'])
    expect(buildCo2Marks([a, empty()])?.values).toEqual([120, null])
    expect(buildCo2Marks([empty(), empty()])).toBeNull()
  })
})
