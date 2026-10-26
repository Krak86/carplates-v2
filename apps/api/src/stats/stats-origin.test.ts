import { describe, expect, it } from 'vitest'

import { foldOriginStats } from './stats-origin.js'

describe('foldOriginStats', () => {
  it('sums per country, biggest first, unknown last', () => {
    const out = foldOriginStats([
      { brandCountry: 'DE', plantCountry: '', n: 5 },
      { brandCountry: 'DE', plantCountry: 'CZ', n: 2 },
      { brandCountry: '', plantCountry: 'CZ', n: 100 },
      { brandCountry: 'JP', plantCountry: 'JP', n: 6 }
    ])
    expect(out.total).toBe(113)
    expect(out.byBrand).toEqual([
      { country: 'DE', n: 7 },
      { country: 'JP', n: 6 },
      { country: '', n: 100 }
    ])
    expect(out.byPlant).toEqual([
      { country: 'CZ', n: 102 },
      { country: 'JP', n: 6 },
      { country: '', n: 5 }
    ])
  })

  it('is empty without rows', () => {
    expect(foldOriginStats([])).toEqual({ total: 0, byBrand: [], byPlant: [] })
  })
})
