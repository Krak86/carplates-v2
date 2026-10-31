import { auctionLots } from '@carplates/db'
import { auctionResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { AuctionsService } from './auctions.service.js'

const FINISHED = new Date('2026-10-31T04:55:05Z')

function lotRow(over: Record<string, unknown> = {}) {
  return {
    lotNo: 100,
    proceedingNo: '123/45',
    status: 'Торги не відбулися',
    category: 'Легкові автомобілі',
    region: 'Київ',
    startPrice: 100000,
    salePrice: null,
    titleRaw: 'Транспортний засіб SUBARU FORESTER, 2007 року випуску, ДНЗ: АА 2335 ЕТ',
    plate: 'АА2335ЕТ',
    vin: null,
    make: 'SUBARU',
    model: 'FORESTER',
    year: 2007,
    sourceFile: 'auctions-31-08-2024.csv',
    firstSeenAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-02T00:00:00Z'),
    ...over
  }
}

function setup(rows: unknown[]) {
  const select = vi.fn().mockImplementation((cols?: unknown) => ({
    from: (table: unknown) => {
      const result = cols ? [{ finishedAt: FINISHED }] : table === auctionLots ? rows : []
      const chain = Object.assign(Promise.resolve(result), {
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain
      })
      return chain
    }
  }))
  return { service: new AuctionsService({ db: { select } } as unknown as DbService), select }
}

describe('AuctionsService.lookup', () => {
  it('maps lots, marks sold ones by sale price and stays schema-valid', async () => {
    const { service } = setup([lotRow({ lotNo: 200, salePrice: 150000 }), lotRow()])
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

  it('reports matchedBy vin / both', async () => {
    const { service } = setup([lotRow({ vin: 'JF1SG5LE58G145231' }), lotRow({ plate: null, vin: 'JF1SG5LE58G145231' })])
    const res = await service.lookup('АА2335ЕТ', 'JF1SG5LE58G145231')
    expect(res.lots.map(l => l.matchedBy)).toEqual(['both', 'vin'])
  })

  it('does not query lots without a key', async () => {
    const { service } = setup([lotRow()])
    const res = await service.lookup(null, null)
    expect(res.lots).toEqual([])
    expect(res.anySold).toBe(false)
  })
})
