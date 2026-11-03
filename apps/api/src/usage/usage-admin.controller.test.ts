import { describe, expect, it, vi } from 'vitest'
import type { AdminServerResponse } from '@carplates/shared'

import type { MarketService } from '../market/market.service.js'
import type { PosthogService } from './posthog.service.js'
import type { ServerStatsService } from './server-stats.service.js'
import { UsageAdminController } from './usage-admin.controller.js'
import type { UsageService } from './usage.service.js'

const snapshot = { cpuCores: 4, users: 3, samples: [] } as unknown as AdminServerResponse

function controller(stats: MarketService['stats']): UsageAdminController {
  return new UsageAdminController(
    {} as UsageService,
    {} as PosthogService,
    { snapshot: vi.fn().mockResolvedValue(snapshot) } as unknown as ServerStatsService,
    { stats } as unknown as MarketService
  )
}

describe('UsageAdminController.server', () => {
  it('adds the CarAPIS counters to the host snapshot', async () => {
    const market = { used: 21, limit: 100, cacheHits: 7, ua: 4, eu: 2 }
    const res = await controller(vi.fn().mockResolvedValue(market)).server()
    expect(res).toMatchObject({ cpuCores: 4, users: 3, market })
  })

  it('sends null when the feature is off', async () => {
    const res = await controller(vi.fn().mockResolvedValue(null)).server()
    expect(res.market).toBeNull()
  })

  it('keeps the host numbers when the counter query fails', async () => {
    const res = await controller(vi.fn().mockRejectedValue(new Error('db down'))).server()
    expect(res).toMatchObject({ cpuCores: 4, market: null })
  })
})
