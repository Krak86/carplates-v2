import { describe, expect, it } from 'vitest'

import { buildHints, isMakerMismatch, pickByYear } from './origin-hints.js'
import { resolveWmi } from './origin.service.js'

describe('pickByYear', () => {
  const rows = [
    { fromYear: 0, toYear: 1991, v: 'old' },
    { fromYear: 1992, toYear: null, v: 'new' }
  ]

  it('picks the row in force', () => {
    expect(pickByYear(rows, 1985)?.v).toBe('old')
    expect(pickByYear(rows, 1995)?.v).toBe('new')
  })

  it('takes the most recent without a year, and the first before any row', () => {
    expect(pickByYear(rows, null)?.v).toBe('new')
    expect(pickByYear([{ fromYear: 1950, v: 'a' }], 1900)?.v).toBe('a')
  })

  it('returns null for no rows', () => {
    expect(pickByYear([], 2000)).toBeNull()
  })
})

describe('isMakerMismatch', () => {
  it('is quiet when the maker matches the brand', () => {
    expect(isMakerMismatch('volkswagen', 'Volkswagen (Brazil)', [])).toBe(false)
    expect(isMakerMismatch('hyundai', 'Hyundai Motor Company', [])).toBe(false)
  })

  it('warns when the prefix names another known brand', () => {
    expect(isMakerMismatch('volkswagen', 'Audi', [])).toBe(true)
  })

  it('does not warn for an owner or a rebadge sibling', () => {
    expect(isMakerMismatch('skoda', 'Volkswagen', ['Volkswagen Group'])).toBe(false)
    expect(isMakerMismatch('chevrolet', 'Daewoo', [])).toBe(false)
  })

  it('never warns without a maker or for a maker it cannot place', () => {
    expect(isMakerMismatch('volkswagen', null, [])).toBe(false)
    expect(isMakerMismatch('volkswagen', 'Xyzzy Heavy Industries', [])).toBe(false)
  })
})

describe('buildHints', () => {
  const base = {
    brandSlug: 'skoda',
    year: 2005,
    period: { countryCode: 'CZ' },
    ownerNames: [],
    wmiMaker: 'Skoda',
    wmiRegion: 'europe',
    plantCountry: 'CZ'
  }

  it('is all quiet for a home-built car', () => {
    expect(buildHints(base)).toEqual({ northAmericaVin: false, makerMismatch: null, assemblyDiffers: null })
  })

  it('notes a plant outside the home country, neutrally', () => {
    expect(buildHints({ ...base, plantCountry: 'IN' }).assemblyDiffers).toEqual({
      brandCountry: 'CZ',
      plantCountry: 'IN'
    })
  })

  it('compares legacy countries by year (Czechoslovak plant of a Czechoslovak brand is no difference)', () => {
    expect(buildHints({ ...base, year: 1985, plantCountry: 'SK' }).assemblyDiffers).toBeNull()
  })

  it('flags a North American VIN as a hint', () => {
    expect(buildHints({ ...base, wmiRegion: 'north-america' }).northAmericaVin).toBe(true)
  })

  it('has no assembly note without a plant or a brand period', () => {
    expect(buildHints({ ...base, plantCountry: null }).assemblyDiffers).toBeNull()
    expect(buildHints({ ...base, period: null }).assemblyDiffers).toBeNull()
  })

  it('reports a maker mismatch', () => {
    expect(buildHints({ ...base, brandSlug: 'volkswagen', wmiMaker: 'Audi' }).makerMismatch).toEqual({
      wmiMaker: 'Audi'
    })
  })
})

describe('resolveWmi', () => {
  it('prefers the table row', () => {
    const wmi = resolveWmi('WVWZZZ1KZ6W000001', 2006, [
      { fromYear: 0, toYear: null, maker: 'Volkswagen', countryCode: 'DE' }
    ])
    expect(wmi).toEqual({ wmi: 'WVW', maker: 'Volkswagen', countryCode: 'DE', region: 'europe' })
  })

  it('trusts the curated plant country over a vPIC importer address (U5Y Kia Slovakia, not US)', () => {
    const wmi = resolveWmi('U5YHN512BDL007162', 2012, [
      { fromYear: 0, toYear: null, maker: 'Hyundai-Kia', countryCode: 'US' }
    ])
    expect(wmi).toEqual({ wmi: 'U5Y', maker: 'Hyundai-Kia', countryCode: 'SK', region: 'europe' })
  })

  it('falls back to the curated list for a prefix vPIC lacks (TMB Skoda)', () => {
    expect(resolveWmi('TMBJJ7NE3J0000001', 2018, [])).toMatchObject({ wmi: 'TMB', countryCode: 'CZ' })
  })

  it('reads only the region for an unknown prefix', () => {
    expect(resolveWmi('QQQ00000000000001', null, [])).toEqual({
      wmi: 'QQQ',
      maker: null,
      countryCode: null,
      region: 'asia'
    })
  })
})
