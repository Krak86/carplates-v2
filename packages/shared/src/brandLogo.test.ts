import { describe, expect, it } from 'vitest'

import { brandLogoUrl } from './brandLogo.js'

describe('brandLogoUrl', () => {
  it('resolves a bare brand name', () => {
    expect(brandLogoUrl('TOYOTA')).toBe('/logos/toyota.png')
    expect(brandLogoUrl('BMW')).toBe('/logos/bmw.png')
  })

  it('strips a double-space-separated model suffix before matching', () => {
    expect(brandLogoUrl('DAEWOO  LANOS')).toBe('/logos/daewoo.png')
    expect(brandLogoUrl('VOLKSWAGEN  TRANSPORTER')).toBe('/logos/volkswagen.png')
  })

  it('matches a multi-word brand name with a single space', () => {
    expect(brandLogoUrl('LAND ROVER')).toBe('/logos/land-rover.png')
  })

  it('maps Cyrillic legacy brand names to their modern export slug', () => {
    expect(brandLogoUrl('ВАЗ')).toBe('/logos/lada.png')
    expect(brandLogoUrl('ЗАЗ')).toBe('/logos/zaz.png')
    expect(brandLogoUrl('ГАЗ')).toBe('/logos/gaz.png')
  })

  it("resolves globally-recognized brands beyond the real ingest's top volume tier", () => {
    expect(brandLogoUrl('FERRARI')).toBe('/logos/ferrari.png')
    expect(brandLogoUrl('ROLLS-ROYCE')).toBe('/logos/rolls-royce.png')
    expect(brandLogoUrl('SCANIA')).toBe('/logos/scania.png')
    expect(brandLogoUrl('УАЗ')).toBe('/logos/uaz.png')
  })

  it('has no logo for a motorcycle-only marque — the source dataset is cars/trucks only', () => {
    expect(brandLogoUrl('YAMAHA')).toBeNull()
    expect(brandLogoUrl('HARLEY-DAVIDSON')).toBeNull()
  })

  it('returns null for a brand with no bundled logo, or no brand at all', () => {
    expect(brandLogoUrl('МУССТАНГ')).toBeNull()
    expect(brandLogoUrl(null)).toBeNull()
    expect(brandLogoUrl('')).toBeNull()
  })
})
