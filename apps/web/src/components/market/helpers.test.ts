import type { MarketCard, MarketResponse } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  countryFlag,
  floatSameYear,
  formatMileageKm,
  formatOriginalPrice,
  formatUsd,
  marketGoHref,
  marketKindOf,
  marketValueKey,
  marketValueText,
  seenDay,
  toMarketView
} from './helpers'

const card = (id: string, year: number | null): MarketCard => ({
  id,
  source: 'auto_ria_ua',
  sourceName: 'Auto.ria',
  year
})

describe('marketKindOf', () => {
  it('defaults to passenger when the kind is unknown to the page', () => {
    expect(marketKindOf(null)).toBe('passenger')
    expect(marketKindOf(undefined)).toBe('passenger')
  })

  it('takes our own kind and the registry source value', () => {
    expect(marketKindOf('truck')).toBe('truck')
    expect(marketKindOf('ЛЕГКОВИЙ')).toBe('passenger')
    expect(marketKindOf('ВАНТАЖНИЙ')).toBe('truck')
    expect(marketKindOf('АВТОБУС')).toBe('bus')
  })

  it('hides the block for kinds the catalogue does not hold', () => {
    expect(marketKindOf('motorcycle')).toBeNull()
    expect(marketKindOf('ПРИЧІП')).toBeNull()
  })
})

describe('countryFlag', () => {
  it('maps ISO2 to a flag emoji and ignores anything else', () => {
    expect(countryFlag('ua')).toBe('🇺🇦')
    expect(countryFlag('DE')).toBe('🇩🇪')
    expect(countryFlag('')).toBe('')
    expect(countryFlag(null)).toBe('')
    expect(countryFlag('DEU')).toBe('')
  })
})

describe('floatSameYear', () => {
  it('puts the closest years first and keeps the API order inside a year', () => {
    const ids = floatSameYear(
      [card('a', 2018), card('b', 2012), card('c', 2013), card('d', 2012), card('e', null)],
      2012
    ).map(c => c.id)
    expect(ids).toEqual(['b', 'd', 'c', 'a', 'e'])
  })

  it('keeps the order without a year', () => {
    expect(floatSameYear([card('a', 2018), card('b', 2012)], null).map(c => c.id)).toEqual(['a', 'b'])
  })
})

describe('toMarketView', () => {
  const base: MarketResponse = { kind: 'ua', items: [card('a', 2012)], fetchedAt: '2026-11-03T10:00:00Z' }

  it('hides on none, empty and no data', () => {
    expect(toMarketView(undefined, 2012)).toBeNull()
    expect(toMarketView({ kind: 'none', items: [] }, 2012)).toBeNull()
    expect(toMarketView({ ...base, items: [] }, 2012)).toBeNull()
  })

  it('maps the answer, defaulting the optional fields', () => {
    expect(toMarketView(base, 2012)).toEqual({
      dataset: 'ua',
      cards: base.items,
      stale: false,
      fetchedAt: '2026-11-03T10:00:00Z',
      budget: null
    })
    const stale = toMarketView({ ...base, kind: 'eu', stale: true, budget: { used: 40, limit: 100 } }, 2012)
    expect(stale).toMatchObject({ dataset: 'eu', stale: true, budget: { used: 40, limit: 100 } })
  })
})

describe('formatting', () => {
  it('formats USD in whole dollars', () => {
    expect(formatUsd(12500, 'en-US')).toBe('$12,500')
    expect(formatUsd(null, 'en-US')).toBeNull()
    expect(formatUsd(Number.NaN, 'en-US')).toBeNull()
  })

  it('shows the original price only for another currency', () => {
    expect(formatOriginalPrice(52000, 'PLN', 'en-US')).toContain('52,000')
    expect(formatOriginalPrice(52000, 'USD', 'en-US')).toBeNull()
    expect(formatOriginalPrice(52000, null, 'en-US')).toBeNull()
    expect(formatOriginalPrice(52000, 'xx1', 'en-US')).toBeNull()
  })

  it('hides a zero or missing mileage', () => {
    expect(formatMileageKm(145000, 'en-US')).toBe('145,000')
    expect(formatMileageKm(0, 'en-US')).toBeNull()
    expect(formatMileageKm(null, 'en-US')).toBeNull()
  })

  it('cuts an ISO timestamp to its day', () => {
    expect(seenDay('2026-11-02T08:15:00Z')).toBe('2026-11-02')
    expect(seenDay('nope')).toBeNull()
    expect(seenDay(null)).toBeNull()
  })

  it('builds the redirect link', () => {
    expect(marketGoHref('0f8c-12ab')).toBe('/api/market/go/0f8c-12ab')
  })
})

describe('marketValueKey', () => {
  it('builds a stable lower snake key and a readable fallback', () => {
    expect(marketValueKey(' Plug-in Hybrid ')).toBe('market.value.plug_in_hybrid')
    expect(marketValueText('plug_in_hybrid')).toBe('plug in hybrid')
  })
})
