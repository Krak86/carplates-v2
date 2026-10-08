import { describe, expect, it } from 'vitest'

import { dealerUrl, newCarsUrl, usedCarsUrl } from './dealerUrl.js'

describe('newCarsUrl', () => {
  it('links to the importer model-list page when one is known', () => {
    expect(newCarsUrl('TOYOTA')).toEqual({ url: 'https://www.toyota.ua/new-cars' })
    expect(newCarsUrl('HYUNDAI  TUCSON')).toEqual({ url: 'https://hyundai.com.ua/all-models' })
  })

  it('returns null when no list page is known, even if the brand has a site', () => {
    expect(newCarsUrl('TESLA')).toBeNull()
    expect(newCarsUrl('FERRARI')).toBeNull()
  })

  it('returns null for an unknown brand', () => {
    expect(newCarsUrl('ВАЗ')).toBeNull()
    expect(newCarsUrl(null)).toBeNull()
  })
})

describe('usedCarsUrl', () => {
  it('returns the importer used-cars page for a brand that has one', () => {
    expect(usedCarsUrl('LEXUS')).toBe('https://usedcars.lexus.ua/')
    expect(usedCarsUrl('LAND ROVER')).toBe('https://landrover.com.ua/avtomobili-z-probigom')
  })

  it('returns null for an empty entry, an unknown brand or no brand', () => {
    expect(usedCarsUrl('TOYOTA')).toBeNull()
    expect(usedCarsUrl('МУССТАНГ')).toBeNull()
    expect(usedCarsUrl(null)).toBeNull()
  })
})

describe('dealerUrl', () => {
  it('resolves a UA-specific official distributor site', () => {
    expect(dealerUrl('TOYOTA')).toBe('https://www.toyota.ua/')
    expect(dealerUrl('SKODA')).toBe('https://www.skoda-auto.ua/')
  })

  it('strips a double-space-separated model suffix before matching', () => {
    expect(dealerUrl('HYUNDAI  TUCSON')).toBe('https://hyundai.com.ua/')
  })

  it("maps a brand sold under another brand's UA site to that site", () => {
    expect(dealerUrl('DACIA')).toBe('https://www.renault.ua/')
  })

  it("falls back to the manufacturer's global site when no UA-specific site was found", () => {
    expect(dealerUrl('TESLA')).toBe('https://www.tesla.com/')
    expect(dealerUrl('FERRARI')).toBe('https://www.ferrari.com/')
  })

  it('returns null for a sanctioned Russian brand — no link is rendered', () => {
    expect(dealerUrl('ВАЗ')).toBeNull()
    expect(dealerUrl('КАМАЗ')).toBeNull()
  })

  it('returns null for a brand with no known site, or no brand at all', () => {
    expect(dealerUrl('МУССТАНГ')).toBeNull()
    expect(dealerUrl(null)).toBeNull()
    expect(dealerUrl('')).toBeNull()
  })
})
