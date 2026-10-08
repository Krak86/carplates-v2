import { describe, it, expect } from 'vitest'

import {
  model360Lookup,
  winner360Lookup,
  winner360ModelSlug,
  type Model360LookupRow,
  type Winner360LookupRow
} from './model360Lookup.js'

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

const wrow = (photoRecid: number, brandSlug: string, modelSlug: string, year: number | null): Winner360LookupRow => ({
  photoRecid,
  brandSlug,
  modelSlug,
  year
})

describe('winner360ModelSlug', () => {
  it('slugifies and drops the trailing New', () => {
    expect(winner360ModelSlug('XC60 New')).toBe('xc60')
    expect(winner360ModelSlug('Range Rover Evoque')).toBe('range-rover-evoque')
    expect(winner360ModelSlug('S5 EV')).toBe('s5-ev')
  })
})

describe('winner360Lookup', () => {
  const rows = [
    wrow(1, 'volvo', 'xc60', 2025),
    wrow(2, 'volvo', 'xc60', 2026),
    wrow(3, 'volvo', 'xc90', 2026),
    wrow(4, 'land-rover', 'range-rover-evoque', 2026)
  ]
  it('returns the make/model panoramas, newest model year first', () => {
    expect(winner360Lookup(rows, 'volvo', 'XC60').map(r => r.photoRecid)).toEqual([2, 1])
  })
  it('matches a registry model name that carries trim words', () => {
    expect(winner360Lookup(rows, 'land-rover', 'RANGE ROVER EVOQUE').map(r => r.photoRecid)).toEqual([4])
  })
  it('is empty for an unknown model, brand or blank input', () => {
    expect(winner360Lookup(rows, 'volvo', 'V40')).toEqual([])
    expect(winner360Lookup(rows, null, 'XC60')).toEqual([])
    expect(winner360Lookup(rows, 'volvo', ' ')).toEqual([])
  })
})
