import { describe, it, expect } from 'vitest'
import type { RdwMatchInfo } from '@carplates/shared'

import {
  effectiveCurrency,
  formatEur,
  formatMoney,
  formatMoneyCopy,
  formatMoneyRange,
  plotSeries,
  riaSearchUrl,
  ukrPrice,
  valueWarnings
} from '@/components/EstimatedValue.helpers'

const FX = { eurUah: 50, usdUah: 40 }

describe('formatMoneyCopy', () => {
  it('copies the shown currency only, with plain spaces and no "~"', () => {
    expect(formatMoneyCopy(10600, 14400, 'EUR', FX, 'uk')).toBe('€ 10 600–14 400')
    expect(formatMoneyCopy(10600, 14400, 'UAH', FX, 'uk')).toBe('₴ 530 000–720 000')
  })

  it('is euros without rates', () => {
    expect(formatMoneyCopy(10600, 14400, 'UAH', null, 'en')).toBe('€ 10,600–14,400')
  })
})

describe('formatMoneyRange', () => {
  it('reads as an approximate signed range, rounded per currency', () => {
    expect(formatMoneyRange(11700, 15900, 'EUR', null, 'en')).toBe('~ € 11,700–15,900')
    expect(formatMoneyRange(11700, 15900, 'USD', FX, 'en')).toBe('~ $ 14,600–19,900')
    expect(formatMoneyRange(1000, 2000, 'UAH', FX, 'en')).toBe('~ ₴ 50,000–100,000')
  })

  it('falls back to euros when no rates are available', () => {
    expect(formatMoney(1234, 'UAH', null, 'en')).toBe('1,200')
    expect(effectiveCurrency('UAH', null)).toBe('EUR')
    expect(effectiveCurrency('UAH', FX)).toBe('UAH')
  })

  it('formats axis euros with a sign', () => {
    expect(formatEur(11700, 'en')).toBe('€11,700')
  })
})

describe('riaSearchUrl', () => {
  it('builds the AUTO.RIA listing path from make, model and year', () => {
    expect(riaSearchUrl('SKODA', 'OCTAVIA', 2012)).toBe('https://auto.ria.com/uk/car/skoda/octavia/year/2012/')
    expect(riaSearchUrl('MERCEDES-BENZ', 'E-CLASS', 2016)).toBe(
      'https://auto.ria.com/uk/car/mercedes-benz/e-class/year/2016/'
    )
    expect(riaSearchUrl(' Tesla ', 'Model 3', 2021)).toBe('https://auto.ria.com/uk/car/tesla/model-3/year/2021/')
  })
})

const match = (over: Partial<RdwMatchInfo> = {}, displacement: number | null = 1598): RdwMatchInfo =>
  ({
    makeName: 'SKODA',
    modelName: 'OCTAVIA',
    how: 'exact',
    crossMake: false,
    exactYear: true,
    specs: { year: 2012, n: 100, displacementCc: displacement ? { min: 1, median: displacement, max: 9999 } : null },
    ...over
  }) as unknown as RdwMatchInfo

const estimate = {
  ageYears: 14,
  retained: 0.09,
  extrapolated: false,
  midEur: 2200,
  lowEur: 1900,
  highEur: 2500
}

describe('ukrPrice', () => {
  it('adds Ukrainian customs to each end of the EU range', () => {
    const p = ukrPrice(match(), estimate, { fuel: 'ДИЗЕЛЬНЕ ПАЛИВО', capacityCc: 1598, makeYear: 2012 }, 2026)
    expect(p.capacityFromRdw).toBe(false)
    expect(p.mid.totalEur).toBeGreaterThan(estimate.midEur)
    expect(p.low.totalEur).toBeLessThan(p.mid.totalEur)
    expect(p.high.totalEur).toBeGreaterThan(p.mid.totalEur)
  })

  it('falls back to the Dutch typical capacity and says so', () => {
    const p = ukrPrice(match(), estimate, { fuel: 'БЕНЗИН', capacityCc: null, makeYear: 2012 }, 2026)
    expect(p.capacityFromRdw).toBe(true)
    expect(p.mid.exciseKnown).toBe(true)
  })
})

describe('valueWarnings', () => {
  const car = { fuel: 'ДИЗЕЛЬНЕ ПАЛИВО', capacityCc: 1598, makeYear: 2012 }

  it('is empty for a clean estimate', () => {
    const m = match()
    expect(valueWarnings(m, estimate, ukrPrice(m, estimate, car, 2026), car.fuel)).toEqual([])
  })

  it('lists every caveat that applies', () => {
    const m = match({ exactYear: false })
    const e = { ...estimate, extrapolated: true, rough: true, priceN: 5 }
    const keys = valueWarnings(m, e, ukrPrice(m, e, { ...car, capacityCc: null }, 2026), car.fuel).map(w => w.key)
    expect(keys).toEqual(['extrapolated', 'rough', 'nearYear', 'capacityFromRdw'])
  })

  it('flags the missing battery excise of an electric car and an unknown excise', () => {
    const m = match(undefined, null)
    const ev = valueWarnings(
      m,
      estimate,
      ukrPrice(m, estimate, { fuel: 'ЕЛЕКТРО', capacityCc: null, makeYear: 2021 }, 2026),
      'ЕЛЕКТРО'
    )
    expect(ev.map(w => w.key)).toEqual(['evExcise'])
    const unknown = valueWarnings(
      m,
      estimate,
      ukrPrice(m, estimate, { fuel: null, capacityCc: null, makeYear: 2015 }, 2026),
      null
    )
    expect(unknown.map(w => w.key)).toEqual(['exciseUnknown'])
  })
})

describe('plotSeries', () => {
  const box = { width: 100, height: 60, left: 10, right: 10, top: 10, bottom: 10 }

  it('maps the first and last points to the plot edges and the baseline to y = 0', () => {
    const s = plotSeries(
      [
        { x: 2010, y: 20000 },
        { x: 2020, y: 10000 }
      ],
      box
    )
    expect(s.plotted[0]).toMatchObject({ px: 10, py: 10 })
    expect(s.plotted[1]).toMatchObject({ px: 90, py: 30 })
    expect(s.toPy(0)).toBe(50)
    expect(s.path).toBe('M10.0 10.0 L90.0 30.0')
  })

  it('widens the x range to include a marked value', () => {
    const s = plotSeries([{ x: 2020, y: 5 }], box, [2018])
    expect(s.xMin).toBe(2018)
    expect(s.toPx(2018)).toBe(10)
  })

  it('centres a single point', () => {
    expect(plotSeries([{ x: 2020, y: 5 }], box).plotted[0]!.px).toBe(50)
  })
})
