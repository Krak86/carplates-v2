import { describe, it, expect } from 'vitest'

import { closestVariantIndex, formatKw, formatPorts } from './OpenEv.helpers'

describe('OpenEv helpers', () => {
  it('formats power with a decimal only when needed', () => {
    expect(formatKw(11)).toBe('11 kW')
    expect(formatKw(7.4)).toBe('7.4 kW')
  })

  it('names known connectors and passes unknown ones through', () => {
    expect(formatPorts(['ccs', 'chademo'])).toBe('CCS, CHAdeMO')
    expect(formatPorts(['gbt'])).toBe('gbt')
  })

  it('picks the variant nearest the car year, ignoring unknown years', () => {
    const variants = [{ releaseYear: 2011 }, { releaseYear: null }, { releaseYear: 2017 }, { releaseYear: 2019 }]
    expect(closestVariantIndex(variants, 2018)).toBe(2)
    expect(closestVariantIndex(variants, 2012)).toBe(0)
  })

  it('singles nothing out for one variant or no year', () => {
    expect(closestVariantIndex([{ releaseYear: 2020 }], 2020)).toBeNull()
    expect(closestVariantIndex([{ releaseYear: 2020 }, { releaseYear: 2021 }], null)).toBeNull()
    expect(closestVariantIndex([{ releaseYear: null }, { releaseYear: null }], 2020)).toBeNull()
  })
})
