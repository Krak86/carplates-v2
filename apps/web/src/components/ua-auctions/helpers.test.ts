import type { AuctionLot } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import {
  LOT_STATUS_KEYS,
  OPEN_STATUS,
  formatLotMonth,
  convertUah,
  formatPrice,
  priceDeltaPercent,
  priceSeries
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

  it('sorts oldest first and numbers rounds per proceeding', () => {
    const series = priceSeries([
      lot(30, 'B', 5),
      lot(20, 'A', 9),
      lot(10, 'A', 12),
      lot(40, null, 3),
      lot(50, 'A', null)
    ])
    expect(series.map(p => [p.lot.lotNo, p.round])).toEqual([
      [10, 1],
      [20, 2],
      [30, 1],
      [40, null]
    ])
  })
})
