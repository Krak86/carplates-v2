import { describe, expect, it } from 'vitest'

import { regionMarker, spreadLogos } from '@/routes/stats/StatsMap.helpers'

describe('spreadLogos', () => {
  it('leaves separated chips where they are', () => {
    const out = spreadLogos(
      [
        { key: 'a', cx: 50, cy: 50, size: 20 },
        { key: 'b', cx: 200, cy: 200, size: 20 }
      ],
      800,
      520
    )
    expect(out.map(p => [p.x, p.y])).toEqual([
      [50, 50],
      [200, 200]
    ])
    expect(out.some(p => p.displaced)).toBe(false)
  })

  it('separates overlapping chips and flags them for leader lines', () => {
    const out = spreadLogos(
      [
        { key: 'big', cx: 100, cy: 100, size: 40 },
        { key: 'small', cx: 104, cy: 102, size: 20 }
      ],
      800,
      520
    )
    const [a, b] = out
    expect(Math.max(Math.abs(a!.x - b!.x), Math.abs(a!.y - b!.y))).toBeGreaterThanOrEqual(30)
    expect(out.some(p => p.displaced)).toBe(true)
  })

  it('handles identical centres and keeps chips inside the box', () => {
    const out = spreadLogos(
      [
        { key: 'a', cx: 5, cy: 5, size: 20 },
        { key: 'b', cx: 5, cy: 5, size: 20 }
      ],
      800,
      520
    )
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(10)
      expect(p.y).toBeGreaterThanOrEqual(10)
    }
    expect(out[0]!.x === out[1]!.x && out[0]!.y === out[1]!.y).toBe(false)
  })
})

describe('regionMarker', () => {
  const labels = { fuel: (c: string) => c.toUpperCase(), country: (c: string) => `country ${c}` }
  const logoOf = (b: string): string | null => (b.includes(' ') && b !== 'LAND ROVER' ? null : `/logos/${b}.svg`)
  const flagOf = (c: string): string | null => (c === 'SU' ? null : `/flags/${c}.svg`)
  const data = {
    fleet: 1000,
    brands: [{ brand: 'VW', n: 200 }],
    models: [{ value: 'VW GOLF', n: 100 }],
    fuels: [
      { value: 'petrol', n: 700 },
      { value: 'electric', n: 50 },
      { value: 'hybrid', n: 30 }
    ],
    origins: [{ value: 'SU', n: 300 }]
  }

  it('draws a logo for brand and model, and a flag or code for origin', () => {
    expect(regionMarker('brand', data, labels, logoOf, flagOf, 'en')?.src).toBe('/logos/VW.svg')
    expect(regionMarker('model', data, labels, logoOf, flagOf, 'en')?.src).toBe('/logos/VW.svg')
    const origin = regionMarker('origin', data, labels, logoOf, flagOf, 'en')
    expect(origin?.src).toBeNull()
    expect(origin?.text).toBe('SU')
  })

  it('shows the top fuel and the electric share', () => {
    expect(regionMarker('fuel', data, labels, logoOf, flagOf, 'en')?.text).toBe('PETROL')
    const ev = regionMarker('ev', data, labels, logoOf, flagOf, 'en')
    expect(ev?.text).toBe('5%')
    expect(ev?.summary).toContain('HYBRID 3%')
  })

  it('returns null without data', () => {
    expect(regionMarker('brand', { ...data, brands: [] }, labels, logoOf, flagOf, 'en')).toBeNull()
    expect(regionMarker('ev', { ...data, fleet: 0 }, labels, logoOf, flagOf, 'en')).toBeNull()
  })
})
