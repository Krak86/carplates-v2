import { describe, it, expect } from 'vitest'

import { parseCards } from './winner360-parse.js'

const card = (over: Record<string, unknown>): Record<string, unknown> => ({
  brand: 'Volvo',
  model: 'XC60 New',
  year: '2026',
  version: 'XC60 B5 Core MY27',
  fuel: 'P',
  photo_360: 'https://stock-photos.winner.ua/x.jpg',
  photo_recid: 5638599697,
  ...over
})

describe('parseCards', () => {
  it('keeps cards with a 360 photo and maps brand/model to slugs', () => {
    const { rows, skipped } = parseCards([
      card({}),
      card({ photo_360: '', photo_recid: 2 }),
      card({ photo_recid: undefined })
    ])
    expect(skipped).toBe(0)
    expect(rows).toEqual([
      {
        photoRecid: 5638599697,
        brandSlug: 'volvo',
        modelSlug: 'xc60',
        brand: 'Volvo',
        model: 'XC60 New',
        year: 2026,
        version: 'XC60 B5 Core MY27',
        fuel: 'petrol',
        photoUrl: 'https://stock-photos.winner.ua/x.jpg'
      }
    ])
  })
  it('dedupes by photo_recid and nulls unknown fuel codes', () => {
    const { rows } = parseCards([card({ fuel: '1' }), card({ fuel: 'E' })])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.fuel).toBe('electric')
    expect(parseCards([card({ fuel: '1' })]).rows[0]!.fuel).toBeNull()
  })
  it('rejects a non-array payload', () => {
    expect(() => parseCards({ error: 'x' })).toThrow()
  })
})
