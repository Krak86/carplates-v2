import { describe, it, expect } from 'vitest'

import { model360Lookup, type Model360LookupRow } from './model360Lookup.js'

const row = (id: number, brandSlug: string, modelSlug: string, label: string): Model360LookupRow => ({
  id,
  brandSlug,
  modelSlug,
  label
})

const ROWS = [
  row(1, 'kia', 'ceed', 'III'),
  row(2, 'kia', 'ceed', 'III FL2021 Hatchback'),
  row(3, 'kia', 'ceed', 'Kombi III'),
  row(4, 'kia', 'rio', 'IV'),
  row(5, 'bmw', '3-series', 'G20')
]

describe('model360Lookup', () => {
  it('returns every gallery of the make/model, facelift year first then newest id', () => {
    expect(model360Lookup(ROWS, 'kia', 'Ceed').map(r => r.id)).toEqual([2, 3, 1])
  })
  it("matches a registry spelling like CEE'D", () => {
    expect(model360Lookup(ROWS, 'kia', "CEE'D")).toHaveLength(3)
  })
  it('maps a BMW trim onto its series', () => {
    expect(model360Lookup(ROWS, 'bmw', '320D').map(r => r.id)).toEqual([5])
  })
  it('is empty for an unknown model, brand or blank input', () => {
    expect(model360Lookup(ROWS, 'kia', 'Sportage')).toEqual([])
    expect(model360Lookup(ROWS, null, 'Ceed')).toEqual([])
    expect(model360Lookup(ROWS, 'kia', ' ')).toEqual([])
  })
})
