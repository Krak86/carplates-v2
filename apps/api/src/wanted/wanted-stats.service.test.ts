import { wantedStatsResponseSchema } from '@carplates/shared'
import { describe, expect, it, vi } from 'vitest'

import type { DbService } from '../db/db.service.js'
import { WantedStatsService } from './wanted-stats.service.js'

const LAST_SEEN = '2026-10-17T05:00:00.000Z'

function setup() {
  const rowsFor = (query: unknown): unknown[] => {
    const text = JSON.stringify(query)
    if (text.includes('wantedNow')) {
      return [
        {
          wantedNow: 3,
          foundTotal: 7,
          foundSinceTracking: 2,
          withPlate: 9,
          withVin: 4,
          medianDays: 12.4,
          historySince: '2020-08-01',
          lastSeen: LAST_SEEN
        }
      ]
    }
    if (text.includes('extract(year')) return [{ label: '2021', stolen: '5', found: '3', wanted: '2' }]
    if (text.includes('seizedAt')) {
      return [
        {
          brand: 'VW',
          model: 'GOLF',
          vehicleType: 'ЛЕГКОВИЙ',
          color: 'BLACK',
          plate: 'AA1111AA',
          seizedAt: '2026-10-01',
          resolvedAt: new Date('2026-10-02T10:00:00Z'),
          region: null
        }
      ]
    }
    if (text.includes('AS label')) return [{ label: 'KYIV', stolen: 2, found: 1, wanted: 1 }]
    return [{ lastSeen: LAST_SEEN }]
  }
  const execute = vi.fn().mockImplementation(async (query: unknown) => ({ rows: rowsFor(query) }))
  const service = new WantedStatsService({ db: { execute } } as unknown as DbService)
  return { service, execute }
}

describe('WantedStatsService', () => {
  it('builds a response that matches the shared contract', async () => {
    const { service } = setup()
    const stats = await service.stats()

    expect(wantedStatsResponseSchema.safeParse(stats).error?.issues).toBeUndefined()
    expect(stats.summary).toMatchObject({
      wantedNow: 3,
      foundTotal: 7,
      medianDaysToFound: 12,
      historySince: '2020-08-01'
    })
    expect(stats.byYear).toEqual([{ label: '2021', stolen: 5, found: 3, wanted: 2 }])
    expect(stats.byRegion[0]?.label).toBe('KYIV')
    expect(stats.recentFound[0]?.resolvedAt).toBe('2026-10-02T10:00:00.000Z')
    expect(stats.checkedAt).toBe(LAST_SEEN)
  })

  it('serves the cache while the feed has not been refreshed', async () => {
    const { service, execute } = setup()
    await service.stats()
    const calls = execute.mock.calls.length
    await service.stats()

    expect(execute.mock.calls.length).toBe(calls + 1) // only the freshness probe
  })
})
