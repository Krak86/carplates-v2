import { auctionLots } from '@carplates/db'
import { auctionListResponseSchema, auctionStatsResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { AuctionsStatsService } from './auctions-stats.service.js'

const FINISHED = new Date('2026-10-31T04:55:05Z')

const dimRow = (label: string) => ({ label, lots: '10', sold: '4', open: '1', avgDelta: 27.14, medianSale: 72749.4 })

function lotRow(over: Record<string, unknown> = {}) {
  return {
    lotNo: 100,
    proceedingNo: '123/45',
    status: 'Торги відбулися',
    category: 'Легкові автомобілі',
    region: 'Київ',
    startPrice: 100000,
    salePrice: 125000,
    titleRaw: 'Транспортний засіб SUBARU FORESTER, 2007 року випуску',
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

function setup(rows: unknown[] = [], total = 0) {
  const execute = vi.fn().mockImplementation(() => {
    // Summary query first in the call order is not guaranteed (Promise.all), so answer by shape: one row works for every query.
    return Promise.resolve({
      rows: [
        {
          ...dimRow('Київ'),
          lots: 16866,
          sold: 4686,
          open: 1717,
          withPlate: 16263,
          withVin: 14978,
          medianStart: 66000,
          totalSale: 718880650.4
        }
      ]
    })
  })
  const select = vi.fn().mockImplementation((cols?: unknown) => ({
    from: (table: unknown) => {
      const result = cols && table !== auctionLots ? [{ finishedAt: FINISHED }] : cols ? [{ total }] : rows
      const chain = Object.assign(Promise.resolve(result), {
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain
      })
      return chain
    }
  }))
  return { service: new AuctionsStatsService({ db: { execute, select } } as unknown as DbService), execute }
}

describe('AuctionsStatsService.stats', () => {
  it('maps the aggregates, rounds them and stays schema-valid', async () => {
    const { service } = setup()
    const res = await service.stats()

    expect(auctionStatsResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.summary).toMatchObject({ lots: 16866, sold: 4686, open: 1717, totalSale: 718880650 })
    expect(res.byRegion[0]).toMatchObject({ label: 'Київ', avgDeltaPercent: 27.1, medianSale: 72749 })
    expect(res.checkedAt).toBe(FINISHED.toISOString())
  })

  it('caches the answer for a while', async () => {
    const { service, execute } = setup()
    await service.stats()
    const calls = execute.mock.calls.length
    await service.stats()
    expect(execute.mock.calls.length).toBe(calls)
  })
})

describe('AuctionsStatsService.list', () => {
  it('returns a schema-valid page with the sold flag and the feed month', async () => {
    const { service } = setup([lotRow(), lotRow({ lotNo: 99, salePrice: null, status: 'Торги не відбулися' })], 140)
    const res = await service.list({ outcome: 'sold', sort: 'newest', asc: false, page: 2 })

    expect(auctionListResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res).toMatchObject({ total: 140, page: 2, pageSize: 25 })
    expect(res.lots.map(l => [l.lotNo, l.sold, l.month])).toEqual([
      [100, true, '2024-08'],
      [99, false, '2024-08']
    ])
  })
})
