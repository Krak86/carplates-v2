import { auctionListLotSchema } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { lotMonth, photoDocIds, unionRowToLot } from './auctions-union.js'
import { PHOTO_DOC, prozorroRow, unionRow } from './auctions-union.fixtures.js'

describe('union rows', () => {
  it('maps a SETAM row: lot number key, SETAM link, feed month, no Prozorro fields', () => {
    const lot = unionRowToLot(unionRow({ sale_price: 150000 }))
    expect(auctionListLotSchema.safeParse(lot).error?.issues).toBeUndefined()
    expect(lot).toMatchObject({
      id: 'setam:100',
      source: 'setam',
      group: 'setam',
      lotNo: 100,
      auctionId: null,
      url: 'https://setam.net.ua/auctions/filters/number=100;',
      category: 'Легкові автомобілі',
      sold: true,
      month: '2024-08',
      sellerName: null,
      photos: []
    })
  })

  it('maps a Prozorro row: full auction id key and link, photo ids, seller, group as category', () => {
    const lot = unionRowToLot(prozorroRow())
    expect(auctionListLotSchema.safeParse(lot).error?.issues).toBeUndefined()
    expect(lot).toMatchObject({
      id: 'prozorro:BRE001-UA-20260924-95103',
      source: 'prozorro',
      group: 'bankruptcy',
      lotNo: null,
      url: 'https://prozorro.sale/auction/BRE001-UA-20260924-95103/',
      rawStatus: 'unsuccessful',
      category: 'bankruptcy',
      sold: false,
      month: null,
      sellerKind: 'bankruptcy',
      auctionStart: '2026-10-13T09:15:00.000Z',
      kilometrage: 988816,
      photos: [PHOTO_DOC]
    })
  })

  it('a winning price makes a Prozorro lot sold', () => {
    expect(unionRowToLot(prozorroRow({ sale_price: 248401, status: 'Торги відбулися' })).sold).toBe(true)
  })

  it('keeps only 32-hex photo ids, once each', () => {
    expect(photoDocIds([`x/${PHOTO_DOC}`, `y/${PHOTO_DOC}`, 'x/short', `x/${'G'.repeat(32)}`])).toEqual([PHOTO_DOC])
    expect(photoDocIds(null)).toEqual([])
  })

  it('reads the month of a feed file name', () => {
    expect(lotMonth('auctions-31-08-2024.csv')).toBe('2024-08')
    expect(lotMonth('whatever.csv')).toBeNull()
    expect(lotMonth(null)).toBeNull()
  })
})
