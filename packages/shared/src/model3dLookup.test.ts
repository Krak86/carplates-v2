import { describe, it, expect } from 'vitest'

import { MAX_MODELS_3D, model3dLookup, type Model3dLookupRow } from './model3dLookup.js'

const row = (uid: string, brandSlug: string, modelSlug: string, likeCount: number): Model3dLookupRow => ({
  uid,
  brandSlug,
  modelSlug,
  likeCount
})

const ROWS = [
  row('a', 'kia', 'ceed', 5),
  row('b', 'kia', 'ceed', 50),
  row('c', 'kia', 'rio', 99),
  row('d', 'bmw', '3-series', 1)
]

describe('model3dLookup', () => {
  it('returns the make/model set, most-liked first', () => {
    expect(model3dLookup(ROWS, 'kia', 'Ceed').map(r => r.uid)).toEqual(['b', 'a'])
  })
  it("matches a registry spelling like CEE'D", () => {
    expect(model3dLookup(ROWS, 'kia', "CEE'D")).toHaveLength(2)
  })
  it('maps a BMW trim onto its series', () => {
    expect(model3dLookup(ROWS, 'bmw', '320D').map(r => r.uid)).toEqual(['d'])
  })
  it('is empty for an unknown model, brand or blank input', () => {
    expect(model3dLookup(ROWS, 'kia', 'Sportage')).toEqual([])
    expect(model3dLookup(ROWS, 'audi', 'A4')).toEqual([])
    expect(model3dLookup(ROWS, null, 'Ceed')).toEqual([])
    expect(model3dLookup(ROWS, 'kia', '  ')).toEqual([])
  })
  it('caps the list', () => {
    const many = Array.from({ length: MAX_MODELS_3D + 5 }, (_, i) => row(String(i), 'kia', 'ceed', i))
    expect(model3dLookup(many, 'kia', 'Ceed')).toHaveLength(MAX_MODELS_3D)
  })
})
