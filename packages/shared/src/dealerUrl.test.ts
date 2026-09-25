import { describe, expect, it } from 'vitest'

import { dealerUrl } from './dealerUrl.js'

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
