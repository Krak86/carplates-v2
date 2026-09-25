import { describe, expect, it } from 'vitest'

import { makeKey, modelKey } from './vehicleKey.js'

describe('makeKey', () => {
  it('reuses the brand logo slug table, stripped to alphanumeric', () => {
    expect(makeKey('MERCEDES-BENZ')).toBe('mercedesbenz')
    expect(makeKey('SKODA')).toBe('skoda')
    expect(makeKey('ВАЗ')).toBe('lada')
  })

  it('strips a double-space model suffix before matching, like brandLogoUrl', () => {
    expect(makeKey('VOLKSWAGEN  TRANSPORTER')).toBe('volkswagen')
  })

  it('falls back to a slugified brand when unmapped', () => {
    expect(makeKey('Some New Brand')).toBe('somenewbrand')
  })

  it("matches regardless of which separator Euro NCAP's own URL slug uses for the same brand", () => {
    // brandSlug('LAND ROVER') is 'land-rover', but Euro NCAP's URL slug is 'land+rover' —
    // both must collapse to the same key, which is the whole reason for stripping to
    // alphanumeric-only rather than preserving a hyphenated canonical form.
    expect(makeKey('LAND ROVER')).toBe('landrover')
    expect(makeKey('ALFA ROMEO')).toBe('alfaromeo')
  })

  it('returns null for no brand', () => {
    expect(makeKey(null)).toBeNull()
    expect(makeKey('')).toBeNull()
  })
})

describe('modelKey', () => {
  it('lowercases and strips everything but letters and digits', () => {
    expect(modelKey('CLA 250')).toBe('cla250')
    expect(modelKey('3 Series')).toBe('3series')
    expect(modelKey('GOLF VARIANT')).toBe('golfvariant')
    expect(modelKey('model+3')).toBe('model3')
  })

  it('returns null for no model', () => {
    expect(modelKey(null)).toBeNull()
    expect(modelKey('')).toBeNull()
  })
})
