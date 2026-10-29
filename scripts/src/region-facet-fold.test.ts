import { describe, expect, it } from 'vitest'

import { foldFacet } from './region-facet-fold.js'

describe('foldFacet', () => {
  it('folds spellings by key, labels with the most common one and keeps the top per region', () => {
    const out = foldFacet(
      'model',
      [
        { region: 'Київ', key: 'A', value: 'Golf', n: 5 },
        { region: 'Київ', key: 'A', value: 'GOLF', n: 9 },
        { region: 'Київ', key: 'B', value: 'Lanos', n: 10 },
        { region: 'Київ', key: 'C', value: 'Zaz', n: 1 },
        { region: 'Львівська область', key: 'C', value: 'Zaz', n: 3 }
      ],
      2
    )
    expect(out).toEqual([
      { facet: 'model', region: 'Київ', value: 'GOLF', n: 14 },
      { facet: 'model', region: 'Київ', value: 'Lanos', n: 10 },
      { facet: 'model', region: 'Львівська область', value: 'Zaz', n: 3 }
    ])
  })
})
