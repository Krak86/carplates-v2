import type { AuctionLot } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  FUEL_TYPES,
  LOT_STATUS_KEYS,
  OPEN_STATUS,
  TRANSMISSIONS,
  formatLotMonth,
  convertUah,
  formatPrice,
  groupLots,
  knownValue,
  lotMonthOf,
  mixLots,
  priceDeltaPercent,
  priceSeries,
  timelineLots,
  visibleLots
} from './helpers'

describe('priceDeltaPercent', () => {
  it('is relative to the start price and rounded', () => {
    expect(priceDeltaPercent(100000, 125000)).toBe(25)
    expect(priceDeltaPercent(10084.2, 20067.36)).toBe(99)
    expect(priceDeltaPercent(100, 70)).toBe(-30)
  })

  it('is null without both prices or a positive start', () => {
    expect(priceDeltaPercent(null, 5)).toBeNull()
    expect(priceDeltaPercent(5, null)).toBeNull()
    expect(priceDeltaPercent(0, 5)).toBeNull()
  })
})

describe('lot statuses', () => {
  it('maps every feed status and treats registration as the open one', () => {
    expect(Object.keys(LOT_STATUS_KEYS)).toHaveLength(7)
    expect(LOT_STATUS_KEYS[OPEN_STATUS]).toBe('registration')
  })

  it('converts hryvnias at the NBU rate and keeps null', () => {
    const rates = { eurUah: 50, usdUah: 40 }
    expect(formatPrice(null, 'UAH', rates, 'en')).toBeNull()
    expect(convertUah(1000, 'EUR', rates)).toBe(20)
    expect(convertUah(1000, 'USD', rates)).toBe(25)
    expect(formatPrice(1000, 'EUR', null, 'en')).toContain('1,000')
    expect(formatPrice(1000, 'EUR', rates, 'en')).toContain('20')
  })
})

describe('formatLotMonth', () => {
  it('formats YYYY-MM and rejects other input', () => {
    expect(formatLotMonth('2024-08', 'en')).toBe('August 2024')
    expect(formatLotMonth(null, 'en')).toBeNull()
    expect(formatLotMonth('2024-8', 'en')).toBeNull()
  })
})

describe('priceSeries', () => {
  const lot = (lotNo: number, proceedingNo: string | null, startPrice: number | null): AuctionLot =>
    ({ lotNo, proceedingNo, startPrice }) as AuctionLot

  it('turns the newest-first answer around and numbers rounds per proceeding', () => {
    const series = priceSeries([
      lot(50, 'A', null),
      lot(40, null, 3),
      lot(30, 'B', 5),
      lot(20, 'A', 9),
      lot(10, 'A', 12)
    ])
    expect(series.map(p => [p.lot.lotNo, p.round])).toEqual([
      [10, 1],
      [20, 2],
      [30, 1],
      [40, null]
    ])
  })
})

describe('groupLots', () => {
  const lot = (id: string, group: AuctionLot['group']): AuctionLot => ({ id, group }) as AuctionLot

  it('orders groups by their newest lot and keeps the lots newest first', () => {
    const groups = groupLots([lot('a', 'customs'), lot('b', 'setam'), lot('c', 'customs'), lot('d', 'bank')])
    expect(groups.map(g => [g.group, g.lots.map(l => l.id)])).toEqual([
      ['customs', ['a', 'c']],
      ['setam', ['b']],
      ['bank', ['d']]
    ])
  })

  it('puts lots saved before Prozorro.Sale (no group) into the SETAM group', () => {
    expect(groupLots([lot('a', undefined), lot('b', null)]).map(g => g.group)).toEqual(['setam'])
    expect(groupLots([])).toEqual([])
  })
})

describe('visibleLots', () => {
  const lot = (id: string, sold: boolean, status = 'Торги не відбулися'): AuctionLot =>
    ({ id, sold, status }) as AuctionLot
  const lots = [
    lot('open', false, OPEN_STATUS),
    lot('n1', false),
    lot('sold', true, 'Торги відбулися'),
    lot('n2', false),
    lot('n3', false),
    lot('n4', false),
    lot('n5', false)
  ]

  it('always shows sold and open lots plus the newest not-sold ones', () => {
    const { shown, hidden, notSold } = visibleLots(lots, false)
    expect(shown.map(l => l.id)).toEqual(['open', 'n1', 'sold', 'n2', 'n3'])
    expect(hidden).toBe(2)
    expect(notSold).toBe(5)
  })

  it('shows everything on request', () => {
    expect(visibleLots(lots, true)).toMatchObject({ hidden: 0, shown: lots })
  })
})

describe('lotMonthOf', () => {
  it('prefers the SETAM feed month and falls back to the Prozorro bidding start', () => {
    expect(lotMonthOf({ month: '2024-08', auctionStart: null })).toBe('2024-08')
    expect(lotMonthOf({ month: null, auctionStart: '2026-10-28T09:00:00.000Z' })).toBe('2026-10')
    expect(lotMonthOf({ month: null, auctionStart: undefined })).toBeNull()
  })
})

describe('knownValue', () => {
  it('passes the enum values and drops free text', () => {
    expect(knownValue(FUEL_TYPES, 'diesel')).toBe('diesel')
    expect(knownValue(FUEL_TYPES, 'бензин')).toBeNull()
    expect(knownValue(TRANSMISSIONS, null)).toBeNull()
  })
})

describe('timelineLots', () => {
  const lot = (lotNo: number, sold: boolean) => ({ lotNo, sold }) as AuctionLot
  it('keeps sold lots and the newest lot', () => {
    expect(timelineLots([lot(4, false), lot(3, false), lot(2, true), lot(1, false)]).map(l => l.lotNo)).toEqual([4, 2])
    expect(timelineLots([])).toEqual([])
  })
})

describe('mixLots', () => {
  it('alternates the two lists', () => {
    expect(mixLots(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], 4)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  it('lets the longer list fill the rest', () => {
    expect(mixLots(['a1'], ['b1', 'b2', 'b3'], 5)).toEqual(['a1', 'b1', 'b2', 'b3'])
    expect(mixLots([], ['b1', 'b2'], 5)).toEqual(['b1', 'b2'])
  })
})
