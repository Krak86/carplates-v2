import { describe, expect, it } from 'vitest'

import { brandLogoUrl } from './brandLogo.js'

describe('brandLogoUrl', () => {
  it('resolves a bare brand name', () => {
    expect(brandLogoUrl('TOYOTA')).toBe('/logos/toyota.webp')
    expect(brandLogoUrl('BMW')).toBe('/logos/bmw.webp')
  })

  it('strips a double-space-separated model suffix before matching', () => {
    expect(brandLogoUrl('DAEWOO  LANOS')).toBe('/logos/daewoo.webp')
    expect(brandLogoUrl('VOLKSWAGEN  TRANSPORTER')).toBe('/logos/volkswagen.webp')
  })

  it('matches a multi-word brand name with a single space', () => {
    expect(brandLogoUrl('LAND ROVER')).toBe('/logos/land-rover.webp')
  })

  it('maps Cyrillic legacy brand names to their modern export slug', () => {
    expect(brandLogoUrl('ВАЗ')).toBe('/logos/lada.webp')
    expect(brandLogoUrl('ЗАЗ')).toBe('/logos/zaz.webp')
    expect(brandLogoUrl('ГАЗ')).toBe('/logos/gaz.webp')
  })

  it("resolves globally-recognized brands beyond the real ingest's top volume tier", () => {
    expect(brandLogoUrl('FERRARI')).toBe('/logos/ferrari.webp')
    expect(brandLogoUrl('ROLLS-ROYCE')).toBe('/logos/rolls-royce.webp')
    expect(brandLogoUrl('SCANIA')).toBe('/logos/scania.webp')
    expect(brandLogoUrl('УАЗ')).toBe('/logos/uaz.webp')
    expect(brandLogoUrl('KRASZ  RMZ20B')).toBe('/logos/kraz.svg')
    expect(brandLogoUrl('КРАЗ')).toBe('/logos/kraz.svg')
    expect(brandLogoUrl('ГАЗ-САЗ  3507')).toBe('/logos/saz.webp')
    expect(brandLogoUrl('САЗ')).toBe('/logos/saz.webp')
    expect(brandLogoUrl('Еталон')).toBe('/logos/etal.webp')
    expect(brandLogoUrl('Одисей')).toBe('/logos/odysey.svg')
    expect(brandLogoUrl('Одісей')).toBe('/logos/odysey.svg')
  })

  it('resolves unknown brands to null', () => {
    expect(brandLogoUrl('NOSUCHBRAND')).toBeNull()
    expect(brandLogoUrl('YAMAHA')).toBe('/logos/yamaha.webp')
  })

  it('returns null for a brand with no bundled logo, or no brand at all', () => {
    expect(brandLogoUrl('МУССТАНГ')).toBeNull()
    expect(brandLogoUrl(null)).toBeNull()
    expect(brandLogoUrl('')).toBeNull()
  })
})
