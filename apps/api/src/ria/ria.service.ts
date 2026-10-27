import { BadGatewayException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { isUaPlate, normalizePlate } from '@carplates/shared'
import type { RiaCheckResponse } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { mapRiaCheck, upstreamRiaSchema } from './ria-parse.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** A registry record changes rarely; a miss may be a transient RIA gap, so it is retried sooner. */
export const HIT_TTL_MS = 7 * DAY_MS
export const MISS_TTL_MS = DAY_MS
const CACHE_MAX = 2_000
const UPSTREAM_TIMEOUT_MS = 10_000
/** RIA answers `x-ratelimit-limit: 5` per ~90 s per IP; stay one under so a manual check from this IP still works. */
export const UPSTREAM_BUDGET = 4
export const UPSTREAM_WINDOW_MS = 90_000

type CacheEntry = { value: RiaCheckResponse | null; expiresAt: number }

const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: 'A',
  В: 'B',
  Е: 'E',
  І: 'I',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X'
}

/**
 * AUTO.RIA's free "check a car" answer for a plate (`/cars-verifyings/api/vin-verifyings/<plate>`), used only when
 * our own registry has nothing, i.e. mostly pre-2013 plates the open data does not cover. Server-side, behind a
 * bounded TTL cache and a budget under RIA's own rate limit, so many visitors cost RIA at most a few calls a minute.
 * Off unless `RIA_CHECK_ENABLED`; a failed or throttled call is never cached.
 */
@Injectable()
export class RiaService {
  private readonly env = loadEnv()
  private readonly cache = new Map<string, CacheEntry>()
  private readonly calls: number[] = []

  async check(rawPlate: string): Promise<RiaCheckResponse> {
    if (!this.env.RIA_CHECK_ENABLED) throw new HttpException('RIA check is disabled', HttpStatus.SERVICE_UNAVAILABLE)
    if (!isUaPlate(rawPlate)) throw new NotFoundException('Not a Ukrainian plate')
    const plate = normalizePlate(rawPlate)

    const hit = this.cache.get(plate)
    if (hit && hit.expiresAt > Date.now()) return this.unwrap(hit.value, plate)

    this.takeBudget()
    const value = await this.fetchPlate(plate)
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(plate, { value, expiresAt: Date.now() + (value ? HIT_TTL_MS : MISS_TTL_MS) })
    return this.unwrap(value, plate)
  }

  private unwrap(value: RiaCheckResponse | null, plate: string): RiaCheckResponse {
    if (!value) throw new NotFoundException(`No RIA record for plate ${plate}`)
    return value
  }

  /** Rolling window over upstream calls; over budget → 429 and the web shows only the outbound link. */
  private takeBudget(): void {
    const now = Date.now()
    while (this.calls.length && this.calls[0]! <= now - UPSTREAM_WINDOW_MS) this.calls.shift()
    if (this.calls.length >= UPSTREAM_BUDGET) {
      throw new HttpException('RIA check is busy', HttpStatus.TOO_MANY_REQUESTS)
    }
    this.calls.push(now)
  }

  private async fetchPlate(plate: string): Promise<RiaCheckResponse | null> {
    const latin = [...plate].map(ch => CYRILLIC_TO_LATIN[ch] ?? ch).join('')
    const url = `${this.env.RIA_CHECK_BASE_URL}/cars-verifyings/api/vin-verifyings/${encodeURIComponent(latin)}?langId=4`
    let res: Response
    try {
      res = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'carsua.app (+https://carsua.app)' },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      })
    } catch {
      throw new BadGatewayException('RIA check unreachable')
    }
    if (res.status === 404 || res.status === 400 || res.status === 204) return null
    if (!res.ok) throw new BadGatewayException(`RIA check answered ${res.status}`)

    const parsed = upstreamRiaSchema.safeParse(await res.json().catch(() => null))
    if (!parsed.success) throw new BadGatewayException('RIA check returned an unexpected shape')
    return mapRiaCheck(plate, parsed.data)
  }
}
