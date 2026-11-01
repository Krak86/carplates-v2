import { auctionResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { AuctionsService } from './auctions.service.js'
import { prozorroRow, unionRow } from './auctions-union.fixtures.js'
import type { UnionRow } from './auctions-union.js'

const FINISHED = new Date('2026-10-31T04:55:05Z')

/** The lookup reads one union query (`execute`) plus the job run and the price-check peers (`select`). */
function setup(rows: UnionRow[], peerCount = 5) {
  const execute = vi.fn().mockResolvedValue({ rows })
  const select = vi.fn().mockImplementation((cols?: unknown) => ({
    from: () => {
      const result =
        'finishedAt' in (cols as object) ? [{ finishedAt: FINISHED }] : [{ peers: peerCount, median: 100000 }]
      const chain = Object.assign(Promise.resolve(result), {
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain
      })
      return chain
    }
  }))
  return { service: new AuctionsService({ db: { select, execute } } as unknown as DbService), select, execute }
}

describe('AuctionsService.lookup', () => {
  it('maps lots, marks sold ones by sale price and stays schema-valid', async () => {
    const { service } = setup([unionRow({ lot_no: 200, sale_price: 150000 }), unionRow()])
    const res = await service.lookup('АА2335ЕТ', null)

    expect(auctionResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.anySold).toBe(true)
    expect(res.checkedAt).toBe(FINISHED.toISOString())
    expect(res.lots.map(l => [l.lotNo, l.sold, l.matchedBy])).toEqual([
      [200, true, 'plate'],
      [100, false, 'plate']
    ])
    expect(res.lots[0]?.month).toBe('2024-08')
  })

  it('adds a price check for the newest sold lot against its peers', async () => {
    const { service } = setup([unionRow({ lot_no: 200, sale_price: 150000 }), unionRow()])
    const res = await service.lookup('АА2335ЕТ', null)
    expect(auctionResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.priceCheck).toEqual({
      lotNo: 200,
      make: 'SUBARU',
      model: 'FORESTER',
      year: 2007,
      salePrice: 150000,
      peers: 5,
      medianSale: 100000,
      deltaPercent: 50
    })
  })

  it('skips the price check with too few peers or no sold lot', async () => {
    const thin = await setup([unionRow({ sale_price: 150000 })], 2).service.lookup('АА2335ЕТ', null)
    expect(thin.priceCheck).toBeNull()
    const unsold = await setup([unionRow()]).service.lookup('АА2335ЕТ', null)
    expect(unsold.priceCheck).toBeNull()
  })

  it('reports matchedBy vin / both', async () => {
    const { service } = setup([
      unionRow({ vin: 'JF1SG5LE58G145231' }),
      unionRow({ plate: null, vin: 'JF1SG5LE58G145231' })
    ])
    const res = await service.lookup('АА2335ЕТ', 'JF1SG5LE58G145231')
    expect(res.lots.map(l => l.matchedBy)).toEqual(['both', 'vin'])
  })

  it('does not query lots without a key', async () => {
    const { service, execute } = setup([unionRow()])
    const res = await service.lookup(null, null)
    expect(res.lots).toEqual([])
    expect(res.anySold).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })

  it('merges Prozorro auctions with SETAM lots in query order; only SETAM lots are price-check candidates', async () => {
    const { service } = setup([
      prozorroRow({ sale_price: 248401, status: 'Торги відбулися' }),
      unionRow({ lot_no: 200, sale_price: 150000, plate: null, vin: 'VF611GTA000122884' })
    ])
    const res = await service.lookup('АА3895КК', 'VF611GTA000122884')
    expect(auctionResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.lots.map(l => [l.source, l.id, l.matchedBy])).toEqual([
      ['prozorro', 'prozorro:BRE001-UA-20260924-95103', 'both'],
      ['setam', 'setam:200', 'vin']
    ])
    expect(res.priceCheck?.lotNo).toBe(200)
  })

  it('a Prozorro-only car is sold without a price check', async () => {
    const { service } = setup([prozorroRow({ sale_price: 248401, status: 'Торги відбулися' })])
    const res = await service.lookup('АА3895КК', null)
    expect(res.anySold).toBe(true)
    expect(res.priceCheck).toBeNull()
  })
})
