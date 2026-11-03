import { describe, expect, it } from 'vitest'

import {
  MARKET_COUNTRY_ORDER,
  MARKET_BODY_FILTER,
  marketCountryRank,
  marketQuerySchema,
  marketResponseSchema,
  marketSourceName,
  sortMarketCards,
  type MarketCard
} from './market.js'

const card = (id: string, country: string | null, lastSeenAt: string | null = null): MarketCard => ({
  id,
  source: 'x',
  sourceName: 'X',
  country,
  lastSeenAt
})

describe('market country order', () => {
  it('ranks listed countries in order and unknown ones last', () => {
    expect(marketCountryRank('de')).toBe(0)
    expect(marketCountryRank('PL')).toBe(1)
    expect(marketCountryRank('JP')).toBe(MARKET_COUNTRY_ORDER.length)
    expect(marketCountryRank(null)).toBe(MARKET_COUNTRY_ORDER.length)
  })

  it('sorts by country rank, then newest first', () => {
    const sorted = sortMarketCards([
      card('a', 'PL', '2026-11-01'),
      card('b', 'DE', '2026-10-01'),
      card('c', 'DE', '2026-11-02'),
      card('d', 'JP')
    ])
    expect(sorted.map(c => c.id)).toEqual(['c', 'b', 'a', 'd'])
  })
})

describe('market contract', () => {
  it('defaults the kind to passenger and rejects unknown kinds', () => {
    expect(marketQuerySchema.parse({}).kind).toBe('passenger')
    expect(marketQuerySchema.safeParse({ kind: 'boat' }).success).toBe(false)
  })

  it('filters trucks and buses by body type, passenger cars not at all', () => {
    expect(MARKET_BODY_FILTER.bus).toBe('bus')
    expect(MARKET_BODY_FILTER.truck).toBe('truck')
    expect(MARKET_BODY_FILTER.passenger).toBeNull()
  })

  it('accepts a minimal response and ignores nothing required', () => {
    expect(marketResponseSchema.safeParse({ kind: 'none', items: [] }).success).toBe(true)
    expect(marketResponseSchema.safeParse({ items: [] }).success).toBe(false)
  })

  it('falls back to the source code for an unknown source', () => {
    expect(marketSourceName('auto_ria_ua')).toBe('Auto.ria')
    expect(marketSourceName('mystery')).toBe('mystery')
  })
})
