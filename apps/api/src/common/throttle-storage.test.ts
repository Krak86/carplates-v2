import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RedisThrottlerStorage, sharedThrottlerStorage } from './throttle-storage.js'
import type { ThrottleRedis } from './throttle-storage.js'

const fakeRedis = (evalImpl: ThrottleRedis['eval']): ThrottleRedis & { quit: ReturnType<typeof vi.fn> } => ({
  eval: evalImpl,
  quit: vi.fn(async () => 'OK')
})

afterEach(() => vi.restoreAllMocks())

describe('RedisThrottlerStorage', () => {
  it('maps the script reply to a record and prefixes the key', async () => {
    const evalFn = vi.fn(async () => [3, 42_500, 0, 0])
    const storage = new RedisThrottlerStorage(fakeRedis(evalFn))
    const record = await storage.increment('k', 60_000, 10, 0, 'medium')
    expect(record).toEqual({ totalHits: 3, timeToExpire: 43, isBlocked: false, timeToBlockExpire: 0 })
    expect(evalFn).toHaveBeenCalledWith(expect.any(String), 2, 'thr:k', 'thr:k:block', 60_000, 10, 0)
  })

  it('blocks once the hits pass the limit and holds the caller until the window ends', async () => {
    const storage = new RedisThrottlerStorage(fakeRedis(async () => [11, 12_001, 0, 0]))
    const record = await storage.increment('k', 60_000, 10, 0, 'medium')
    expect(record.isBlocked).toBe(true)
    expect(record.timeToBlockExpire).toBe(13)
  })

  it('reports the block TTL when the script says the key is blocked', async () => {
    const storage = new RedisThrottlerStorage(fakeRedis(async () => [11, 5_000, 1, 30_000]))
    const record = await storage.increment('k', 60_000, 10, 30_000, 'medium')
    expect(record).toMatchObject({ isBlocked: true, timeToBlockExpire: 30 })
  })

  it('fails open into per-process counting when Redis errors, and warns once', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const storage = new RedisThrottlerStorage(
      fakeRedis(async () => {
        throw new Error('Stream isn’t writeable')
      })
    )
    const first = await storage.increment('k', 60_000, 2, 0, 'medium')
    const second = await storage.increment('k', 60_000, 2, 0, 'medium')
    const third = await storage.increment('k', 60_000, 2, 0, 'medium')
    expect([first.isBlocked, second.isBlocked, third.isBlocked]).toEqual([false, false, true])
    expect(warn).toHaveBeenCalledTimes(1)
    await storage.onApplicationShutdown()
  })

  it('closes the connection on shutdown even when quit fails', async () => {
    const redis = fakeRedis(async () => [1, 1, 0, 0])
    redis.quit.mockRejectedValue(new Error('closed'))
    await expect(new RedisThrottlerStorage(redis).onApplicationShutdown()).resolves.toBeUndefined()
  })
})

describe('sharedThrottlerStorage', () => {
  it('is undefined without REDIS_URL so Nest keeps its in-memory store', () => {
    expect(sharedThrottlerStorage(undefined)).toBeUndefined()
    expect(sharedThrottlerStorage('')).toBeUndefined()
  })
})
