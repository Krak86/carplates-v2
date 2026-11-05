import { describe, expect, it } from 'vitest'

import { fleetSummary, markerChips } from '@/routes/alarms/cars-helpers'

const brands = { fleet: 1000, brands: [1, 2, 3, 4].map(i => ({ brand: `B${i}`, n: 100 - i })) }
const facets = {
  fleet: 1000,
  models: [{ value: 'TOYOTA CAMRY', n: 50 }],
  fuels: [
    { value: 'electric', n: 40 },
    { value: 'diesel', n: 300 }
  ],
  origins: [{ value: 'JP', n: 200 }]
}

describe('fleetSummary', () => {
  it('is null when neither rollup has the region', () => {
    expect(fleetSummary(undefined, undefined)).toBeNull()
  })

  it('keeps the top three brands and reads fuel classes (missing = 0)', () => {
    const s = fleetSummary(brands, facets)
    expect(s?.brands.map(b => b.brand)).toEqual(['B1', 'B2', 'B3'])
    expect(s).toMatchObject({ fleet: 1000, electric: 40, diesel: 300, hybrid: 0 })
    expect(s?.topModel?.value).toBe('TOYOTA CAMRY')
  })

  it('works with only one rollup', () => {
    expect(fleetSummary(undefined, facets)?.brands).toEqual([])
    expect(fleetSummary(brands, undefined)?.topModel).toBeNull()
  })
})

describe('markerChips', () => {
  const labels = { fuel: (c: string) => c, country: (c: string) => c }
  const centers = new Map<string, readonly [number, number]>([
    ['Київ', [100, 100]],
    ['Львівська область', [300, 200]]
  ])

  it('draws a chip only for regions that have data, never moving them off the map', () => {
    const chips = markerChips(
      'brand',
      centers,
      { brands: new Map([['Київ', brands]]), facets: new Map() },
      labels,
      b => `/logo/${b}.svg`,
      () => null,
      'en'
    )
    expect(chips.map(c => c.key)).toEqual(['Київ'])
    expect(chips[0]?.marker.src).toBe('/logo/B1.svg')
  })

  it('shows the electric share as text in ev mode', () => {
    const chips = markerChips(
      'ev',
      centers,
      { brands: new Map(), facets: new Map([['Київ', facets]]) },
      labels,
      () => null,
      () => null,
      'en'
    )
    expect(chips[0]?.marker.text).toBe('4%')
  })
})
