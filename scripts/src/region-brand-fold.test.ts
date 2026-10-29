import { describe, expect, it } from 'vitest'

import { foldRegionBrands } from './region-brand-fold.js'

describe('foldRegionBrands', () => {
  it('folds spellings of one brand, ranks them and adds the region fleet', () => {
    const out = foldRegionBrands([
      { region: 'Київ', brand: 'TOYOTA', n: 50 },
      { region: 'Київ', brand: 'VOLKSWAGEN', n: 70 },
      { region: 'Київ', brand: 'Toyota', n: 30 },
      { region: 'Львівська область', brand: 'SKODA', n: 5 }
    ])
    expect(out.filter(r => r.region === 'Київ')).toEqual([
      { region: 'Київ', brand: '', n: 150 },
      { region: 'Київ', brand: 'TOYOTA', n: 80 },
      { region: 'Київ', brand: 'VOLKSWAGEN', n: 70 }
    ])
    expect(out).toContainEqual({ region: 'Львівська область', brand: '', n: 5 })
  })

  it('keeps only the top 5 brands per region', () => {
    const rows = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7'].map((brand, i) => ({
      region: 'Київ',
      brand: `ZZ${brand}`,
      n: 10 - i
    }))
    const out = foldRegionBrands(rows)
    expect(out.filter(r => r.brand !== '')).toHaveLength(5)
  })
})
