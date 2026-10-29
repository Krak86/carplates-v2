import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { SearchService, type SearchFilters } from './search.service.js'

function row(plate: string, brand: string, makeYear: number | null) {
  return {
    plate,
    vin: null,
    brand,
    model: 'X',
    makeYear,
    color: null,
    fuel: null,
    dReg: null,
    kind: null,
    body: null,
    operName: null
  }
}

/** Like a Drizzle query: a lazy thenable that runs again on every await. */
function lazyQuery<T>(run: () => Promise<T>) {
  return { then: (resolve: (v: T) => unknown, reject: (e: unknown) => unknown) => run().then(resolve, reject) }
}

function setup(rows: ReturnType<typeof row>[]) {
  const runs = vi.fn(() => Promise.resolve(rows))
  const limit = vi.fn(() => lazyQuery(runs))
  const chain = { select: () => chain, from: () => chain, where: () => chain, limit }
  const service = new SearchService({ db: chain } as unknown as DbService)
  return { service, limit, runs }
}

const base: SearchFilters = { brand: 'kia', sort: 'plate', dir: 'asc', page: 1, pageSize: 2 }

describe('SearchService.search cache', () => {
  const rows = [row('AA0003AA', 'KIA', 2010), row('AA0001AA', 'KIA', null), row('AA0002AA', 'KIA', 2020)]

  it('queries once for pages and sorts of the same filters', async () => {
    const { service, limit, runs } = setup(rows)
    const p1 = await service.search(base)
    const p2 = await service.search({ ...base, page: 2 })
    const byYear = await service.search({ ...base, sort: 'makeYear', dir: 'desc' })

    expect(limit).toHaveBeenCalledTimes(1)
    expect(runs).toHaveBeenCalledTimes(1)
    expect(p1.results.map(r => r.plate)).toEqual(['AA0001AA', 'AA0002AA'])
    expect(p2.results.map(r => r.plate)).toEqual(['AA0003AA'])
    expect(p1.total).toBe(3)
    // nulls last even when descending
    expect(byYear.results.map(r => r.plate)).toEqual(['AA0002AA', 'AA0003AA'])
  })

  it('queries again for different filters', async () => {
    const { service, limit } = setup(rows)
    await service.search(base)
    await service.search({ ...base, brand: 'bmw' })

    expect(limit).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed query', async () => {
    const { service, limit } = setup(rows)
    limit.mockRejectedValueOnce(new Error('db down'))

    await expect(service.search(base)).rejects.toThrow('db down')
    await expect(service.search(base)).resolves.toMatchObject({ total: 3 })
    expect(limit).toHaveBeenCalledTimes(2)
  })
})
