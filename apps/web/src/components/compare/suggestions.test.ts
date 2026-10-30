import { describe, expect, it } from 'vitest'

import { buildSuggestions } from './suggestions'
import type { CompareLoaded } from './types'

const loaded = (over: Partial<CompareLoaded> = {}): CompareLoaded => ({
  car: { year: 2018, fuel: 'ДИЗЕЛЬНЕ ПАЛИВО' } as CompareLoaded['car'],
  rdw: {
    priceByFuel: [
      { fuel: 'diesel', priceEur: 30000, n: 100 },
      { fuel: 'petrol', priceEur: 28000, n: 80 },
      { fuel: 'phev', priceEur: 40000, n: 5 }
    ]
  } as unknown as CompareLoaded['rdw'],
  wiki: null,
  euroNcap: null,
  nhtsaStars: null,
  rdwRecalls: null,
  nhtsaRecalls: null,
  nhtsaComplaints: null,
  motFailRate: null,
  mot: null,
  generations: [
    { code: 'Mk6', label: 'Mk6', yearFrom: 2008, yearTo: 2012 },
    { code: 'Mk7', label: 'Mk7', yearFrom: 2013, yearTo: 2019 }
  ],
  catalog: {
    make: 'vw',
    model: 'golf',
    makeName: 'Volkswagen',
    modelName: 'Golf',
    siblings: [{ model: 'passat', modelName: 'Passat' }]
  } as unknown as CompareLoaded['catalog'],
  ...over
})

describe('buildSuggestions', () => {
  it('offers another fuel, the previous generation and siblings', () => {
    const out = buildSuggestions(loaded())
    expect(out.map(s => s.kind)).toEqual(['otherFuel', 'previousGeneration', 'sibling'])
    expect(out[0]?.ref).toMatchObject({ make: 'vw', model: 'golf', year: 2018, fuel: 'petrol' })
    expect(out[1]?.ref).toMatchObject({ year: 2012, fuel: 'diesel' })
  })

  it('offers nothing without a catalog page', () => {
    expect(buildSuggestions(loaded({ catalog: null }))).toEqual([])
  })
})
