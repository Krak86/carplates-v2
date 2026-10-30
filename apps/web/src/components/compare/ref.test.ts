import { describe, expect, it } from 'vitest'

import { compareHref, formatCompareRef, parseCompareRef, sameRef } from './ref'

describe('parseCompareRef', () => {
  it('reads a plate and normalizes Latin letters to the canonical Cyrillic plate', () => {
    expect(parseCompareRef('plate:AA1234BB')).toEqual({ kind: 'plate', plate: 'АА1234ВВ' })
    expect(parseCompareRef('aa 1234 bb')).toEqual({ kind: 'plate', plate: 'АА1234ВВ' })
  })

  it('reads a VIN, with or without the prefix', () => {
    const vin = 'WBA8E9C50GK123456'
    expect(parseCompareRef(`vin:${vin.toLowerCase()}`)).toEqual({ kind: 'vin', vin })
    expect(parseCompareRef(vin)).toEqual({ kind: 'vin', vin })
  })

  it('refuses a malformed VIN behind the prefix', () => {
    expect(parseCompareRef('vin:WBA8E9C50GK12345')).toBeNull()
    expect(parseCompareRef('vin:WBA8E9C50GK12345O')).toBeNull()
  })

  it('reads a model ref with and without a fuel class', () => {
    expect(parseCompareRef('m:bmw/3series/2015/diesel')).toEqual({
      kind: 'model',
      make: 'bmw',
      model: '3series',
      year: 2015,
      fuel: 'diesel'
    })
    expect(parseCompareRef('m:mercedes-benz/eclass/2012')).toEqual({
      kind: 'model',
      make: 'mercedes-benz',
      model: 'eclass',
      year: 2012,
      fuel: null
    })
  })

  it('refuses a model ref with a bad slug, year, fuel or extra part', () => {
    expect(parseCompareRef('m:BMW/3series/2015')).toBeNull()
    expect(parseCompareRef('m:bmw/3series/20x5')).toBeNull()
    expect(parseCompareRef('m:bmw/3series/1800')).toBeNull()
    expect(parseCompareRef('m:bmw/3series/2015/steam')).toBeNull()
    expect(parseCompareRef('m:bmw/3series/2015/diesel/x')).toBeNull()
    expect(parseCompareRef('m:bmw')).toBeNull()
  })

  it('gives null for empty input and unknown prefixes', () => {
    expect(parseCompareRef(null)).toBeNull()
    expect(parseCompareRef('   ')).toBeNull()
    expect(parseCompareRef('car:AA1234BB')).toBeNull()
  })
})

describe('formatCompareRef / compareHref', () => {
  it('round-trips every kind', () => {
    for (const raw of ['plate:АА1234ВВ', 'vin:WBA8E9C50GK123456', 'm:bmw/3series/2015/diesel', 'm:bmw/3series/2015']) {
      const ref = parseCompareRef(raw)
      expect(ref && formatCompareRef(ref)).toBe(raw)
    }
  })

  it('keeps ":" and "/" readable in the URL and leaves an empty slot out', () => {
    const b = parseCompareRef('m:bmw/3series/2015/diesel')
    expect(compareHref(null, b)).toBe('/compare?b=m:bmw/3series/2015/diesel')
    expect(compareHref(null, null)).toBe('/compare')
  })

  it('knows when both slots hold the same car', () => {
    const a = parseCompareRef('plate:AA1234BB')
    expect(sameRef(a, parseCompareRef('аа1234вв'))).toBe(true)
    expect(sameRef(a, parseCompareRef('m:bmw/3series/2015'))).toBe(false)
    expect(sameRef(a, null)).toBe(false)
  })
})
