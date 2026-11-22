import { Logger } from '@nestjs/common'
import { ThrottlerStorageService } from '@nestjs/throttler'
import type { ThrottlerStorage } from '@nestjs/throttler'
import { Redis } from 'ioredis'

type ThrottleRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>

/** Minimal slice of ioredis the store needs (a fake in tests). */
export type ThrottleRedis = {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>
  quit(): Promise<unknown>
}

/**
 * Fixed window per key: INCR, PEXPIRE on the first hit. `blockDuration` is unused by the app's limits but the interface
 * has it, so a block key is honoured. Returns { hits, ttl ms, blocked, block ttl ms }.
 */
const SCRIPT = `
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local block = tonumber(ARGV[3])
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  return { tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('PTTL', KEYS[1]), 1, blockTtl }
end
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if hits == 1 or pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ttl)
  pttl = ttl
end
if block > 0 and hits > limit then
  redis.call('SET', KEYS[2], '1', 'PX', block)
  return { hits, pttl, 1, block }
end
return { hits, pttl, 0, 0 }
`

const KEY_PREFIX = 'thr:'
/** Log a Redis outage once per minute, not once per request. */
const WARN_EVERY_MS = 60_000

/**
 * Throttler store shared by every api instance (blue and green overlap during a deploy; a restart no longer resets the
 * counters). **Fails open into the in-process memory store**: when Redis errors or times out, the request is still counted
 * (per process) and never answered 5xx, so a Redis outage weakens the limit to the old per-process behaviour instead of
 * taking the API down.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('ThrottlerStorage')
  private readonly fallback = new ThrottlerStorageService()
  private lastWarnAt = 0

  constructor(private readonly redis: ThrottleRedis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottleRecord> {
    try {
      const raw = await this.redis.eval(
        SCRIPT,
        2,
        `${KEY_PREFIX}${key}`,
        `${KEY_PREFIX}${key}:block`,
        ttl,
        limit,
        blockDuration
      )
      const [hits = 0, pttl = 0, blocked = 0, blockTtl = 0] = (Array.isArray(raw) ? raw : []).map(Number)
      const isBlocked = blocked === 1 || hits > limit
      return {
        totalHits: hits,
        timeToExpire: Math.max(0, Math.ceil(pttl / 1000)),
        isBlocked,
        // Without a block duration the caller is held until the window ends.
        timeToBlockExpire: isBlocked ? Math.max(1, Math.ceil((blocked === 1 ? blockTtl : pttl) / 1000)) : 0
      }
    } catch (error) {
      this.warn(error)
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName)
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined)
    await this.fallback.onApplicationShutdown()
  }

  private warn(error: unknown, now = Date.now()): void {
    if (now - this.lastWarnAt < WARN_EVERY_MS) return
    this.lastWarnAt = now
    this.logger.warn(
      `Redis unavailable, throttling per process until it is back: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

let shared: ThrottlerStorage | undefined

/**
 * One store for all three `ThrottlerModule.forRoot` calls (app, auth, recognize). `undefined` without `REDIS_URL`, so Nest
 * keeps its default in-memory store (tests, local dev). Short timeouts and no offline queue: a dead Redis must cost a request
 * milliseconds, not hang it.
 */
export const sharedThrottlerStorage = (redisUrl: string | undefined): ThrottlerStorage | undefined => {
  if (!redisUrl) return undefined
  shared ??= new RedisThrottlerStorage(createRedis(redisUrl))
  return shared
}

const createRedis = (url: string): Redis => {
  const redis = new Redis(url, {
    connectionName: 'carsua-api-throttler',
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: 250,
    connectTimeout: 2_000,
    retryStrategy: (attempt: number): number => Math.min(attempt * 200, 5_000)
  })
  // ioredis emits `error` on every failed reconnect; unhandled it would crash the process. The store logs a throttled warning.
  redis.on('error', () => undefined)
  return redis
}
