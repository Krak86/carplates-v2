import { describe, expect, it } from 'vitest'

import { topRegionShares } from './RegionTopStrip.helpers'

describe('topRegionShares', () => {
  const rows = [
    { label: 'Київ', value: 50 },
    { label: 'Львівська', value: 20 },
    { label: 'Одеська', value: 20 },
    { label: 'Волинська', value: 10 },
    { label: 'Закарпатська', value: 0 }
  ]

  it('returns the top 3 with shares of the whole country', () => {
    const top = topRegionShares(rows)
    expect(top.map(r => r.region)).toEqual(['Київ', 'Львівська', 'Одеська'])
    expect(top[0]?.share).toBeCloseTo(0.5)
    expect(top[1]?.share).toBeCloseTo(0.2)
  })

  it('keeps the input order on ties', () => {
    expect(topRegionShares(rows, 3).map(r => r.region)).toEqual(['Київ', 'Львівська', 'Одеська'])
  })

  it('skips regions without a value and handles empty or zero data', () => {
    expect(topRegionShares(rows, 10)).toHaveLength(4)
    expect(topRegionShares([])).toEqual([])
    expect(topRegionShares([{ label: 'Київ', value: 0 }])).toEqual([])
  })
})
