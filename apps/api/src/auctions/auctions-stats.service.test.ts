import { auctionListResponseSchema, auctionStatsResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { AuctionsStatsService } from './auctions-stats.service.js'
import { prozorroRow, unionRow } from './auctions-union.fixtures.js'
import type { UnionRow } from './auctions-union.js'

const FINISHED = new Date('2026-10-31T04:55:05Z')

const dimRow = (label: string) => ({ label, lots: '10', sold: '4', open: '1', avgDelta: 27.14, medianSale: 72749.4 })

/** `execute`: the stats queries all get the one aggregate row; the list answers its page, then its count. */
function setup(pages: UnionRow[] = [], total = 0) {
  const stats = {
    ...dimRow('Київ'),
    lots: 16866,
    sold: 4686,
    open: 1717,
    withPlate: 16263,
    withVin: 14978,
    medianStart: 66000,
    totalSale: 718880650.4,
    relisted: 2100,
    maxRounds: 9
  }
  const execute = vi.fn().mockImplementation((query: { queryChunks?: unknown[] }) => {
    const text = JSON.stringify(query.queryChunks ?? [])
    if (text.includes('l.*')) return Promise.resolve({ rows: pages })
    if (text.includes('AS total')) return Promise.resolve({ rows: [{ total }] })
    return Promise.resolve({ rows: [stats] })
  })
  const select = vi.fn().mockImplementation(() => {
    const chain = Object.assign(Promise.resolve([{ finishedAt: FINISHED }]), {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain
    })
    return chain
  })
  return { service: new AuctionsStatsService({ db: { execute, select } } as unknown as DbService), execute }
}

describe('AuctionsStatsService.stats', () => {
  it('maps the aggregates, rounds them and stays schema-valid', async () => {
    const { service } = setup()
    const res = await service.stats()

    expect(auctionStatsResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res.summary).toMatchObject({
      lots: 16866,
      sold: 4686,
      open: 1717,
      totalSale: 718880650,
      relistedProceedings: 2100,
      maxRounds: 9
    })
    expect(res.byRegion[0]).toMatchObject({ label: 'Київ', avgDeltaPercent: 27.1, medianSale: 72749 })
    expect(res.checkedAt).toBe(FINISHED.toISOString())
  })

  it('caches the answer for a while, per source', async () => {
    const { service, execute } = setup()
    await service.stats()
    const calls = execute.mock.calls.length
    await service.stats()
    expect(execute.mock.calls.length).toBe(calls)
    await service.stats('prozorro')
    expect(execute.mock.calls.length).toBeGreaterThan(calls)
  })
})

describe('AuctionsStatsService.list', () => {
  it('returns a schema-valid page of both sources with the sold flag, the feed month and the key', async () => {
    const { service } = setup(
      [
        prozorroRow({ sale_price: 248401, status: 'Торги відбулися' }),
        unionRow({ sale_price: 125000, status: 'Торги відбулися' }),
        unionRow({ lot_no: 99, status: 'Торги не відбулися' })
      ],
      140
    )
    const res = await service.list({ outcome: 'sold', sort: 'newest', asc: false, page: 2 })

    expect(auctionListResponseSchema.safeParse(res).error?.issues).toBeUndefined()
    expect(res).toMatchObject({ total: 140, page: 2, pageSize: 25 })
    expect(res.lots.map(l => [l.id, l.sold, l.month])).toEqual([
      ['prozorro:BRE001-UA-20260924-95103', true, null],
      ['setam:100', true, '2024-08'],
      ['setam:99', false, '2024-08']
    ])
  })
})
