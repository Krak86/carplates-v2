import { afterEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(
  () => ({ CLOUDFLARE_API_TOKEN: 'tok', CLOUDFLARE_ZONE_ID: 'zone' }) as Record<string, string | undefined>
)

vi.mock('../env.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../env.js')>()),
  loadEnv: () => env
}))

import { CloudflareService } from './cloudflare.service.js'

const ok = (groups: unknown[]) =>
  Promise.resolve(new Response(JSON.stringify({ data: { viewer: { zones: [{ httpRequests1dGroups: groups }] } } })))

afterEach(() => {
  vi.unstubAllGlobals()
  env.CLOUDFLARE_API_TOKEN = 'tok'
  env.CLOUDFLARE_ZONE_ID = 'zone'
})

describe('CloudflareService', () => {
  it('reports not configured without calling Cloudflare', async () => {
    env.CLOUDFLARE_API_TOKEN = undefined
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await new CloudflareService().summary()).toEqual({ configured: false, error: null, days: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps the daily groups and caches the answer', async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValue(
        ok([{ dimensions: { date: '2026-11-06' }, sum: { requests: 100, cachedRequests: 40 }, uniq: { uniques: 7 } }])
      )
    vi.stubGlobal('fetch', fetchMock)
    const service = new CloudflareService()
    const first = await service.summary()
    expect(first.days).toEqual([{ date: '2026-11-06', requests: 100, cachedRequests: 40, visitors: 7 }])
    await service.summary()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces a GraphQL error without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null, errors: [{ message: 'not authorized' }] })))
    )
    const res = await new CloudflareService().summary()
    expect(res).toMatchObject({ configured: true, days: [] })
    expect(res.error).toContain('not authorized')
  })
})
