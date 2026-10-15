import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, MaintenanceError, getStats } from '@/lib/api'
import { isMaintenance, retryDelayQuery, retryQuery, setMaintenance, subscribeMaintenance } from '@/lib/maintenance'
import { queryClient } from '@/lib/query'

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
  queryClient.clear()
  setMaintenance(false)
})

describe('maintenance answer from the proxy', () => {
  it('turns a 503 {"status":"maintenance"} into a MaintenanceError carrying Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(503, { status: 'maintenance', retryAfter: 30 }))
    )
    const error = await getStats().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MaintenanceError)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as MaintenanceError).retryAfterSeconds).toBe(30)
  })

  it('leaves other 503s (and other statuses) as a plain ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(503, { message: 'upstream down' }))
    )
    const error = await getStats().catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(MaintenanceError)
    expect(error).toMatchObject({ status: 503, message: 'upstream down' })
  })
})

describe('retry policy', () => {
  it('retries maintenance for ~2 minutes and everything else once', () => {
    const maintenance = new MaintenanceError(30)
    expect(retryQuery(0, maintenance)).toBe(true)
    expect(retryQuery(23, maintenance)).toBe(true)
    expect(retryQuery(24, maintenance)).toBe(false)
    expect(retryQuery(0, new ApiError(500, 'x'))).toBe(true)
    expect(retryQuery(1, new ApiError(500, 'x'))).toBe(false)
  })

  it('polls maintenance every ≤5 s but keeps exponential backoff otherwise', () => {
    expect(retryDelayQuery(0, new MaintenanceError(30))).toBe(5000)
    expect(retryDelayQuery(0, new MaintenanceError(2))).toBe(2000)
    expect(retryDelayQuery(0, new MaintenanceError(undefined))).toBe(5000)
    expect(retryDelayQuery(2, new ApiError(500, 'x'))).toBe(4000)
  })
})

describe('banner flag', () => {
  it('is on while a query retries against maintenance and clears when a query succeeds', async () => {
    const seen: boolean[] = []
    const unsubscribe = subscribeMaintenance(() => seen.push(isMaintenance()))
    let calls = 0
    const result = await queryClient.fetchQuery({
      queryKey: ['maintenance-test'],
      retryDelay: 10,
      queryFn: () => {
        calls += 1
        if (calls < 3) throw new MaintenanceError(1)
        return 'ok'
      }
    })
    unsubscribe()
    expect(result).toBe('ok')
    expect(seen).toEqual([true, false])
    expect(isMaintenance()).toBe(false)
  })
})
