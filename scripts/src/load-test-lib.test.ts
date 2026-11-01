import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exceedsThreshold,
  parsePlates,
  percentile,
  resolveTarget,
  runStage,
  type StageResult
} from './load-test-lib.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('percentile', () => {
  it('returns 0 for an empty list', () => {
    expect(percentile([], 95)).toBe(0)
  })

  it('picks the value at the rank and clamps at the end', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(sorted, 50)).toBe(51)
    expect(percentile(sorted, 95)).toBe(96)
    expect(percentile(sorted, 100)).toBe(100)
  })
})

describe('parsePlates', () => {
  it('splits on LF and CRLF, trims, and drops blank lines', () => {
    expect(parsePlates('AA1234BB\r\n  KA0001AA \n\n')).toEqual(['AA1234BB', 'KA0001AA'])
  })
})

describe('resolveTarget', () => {
  it('accepts local hosts and strips the trailing slash', () => {
    expect(resolveTarget('http://localhost:3000/', false)).toBe('http://localhost:3000')
    expect(resolveTarget('http://127.0.0.1:3000', false)).toBe('http://127.0.0.1:3000')
  })

  it('refuses a remote host without allowRemote', () => {
    expect(() => resolveTarget('https://carsua.app', false)).toThrow(/carsua\.app/)
  })

  it('allows a remote host with allowRemote', () => {
    expect(resolveTarget('https://carsua.app', true)).toBe('https://carsua.app')
  })
})

describe('exceedsThreshold', () => {
  const ok: StageResult = { users: 5, rps: 10, p50: 20, p95: 100, p99: 200, errorPct: 0, throttled: 0 }

  it('is false at or under both limits', () => {
    expect(exceedsThreshold(ok, 100, 0)).toBe(false)
  })

  it('is true when p95 or the error rate is over', () => {
    expect(exceedsThreshold({ ...ok, p95: 101 }, 100, 1)).toBe(true)
    expect(exceedsThreshold({ ...ok, errorPct: 1.1 }, 1000, 1)).toBe(true)
  })
})

describe('runStage', () => {
  function run(
    statuses: (n: number) => number | Error,
    plates = ['AA1234BB']
  ): Promise<{ result: StageResult; calls: string[] }> {
    vi.useFakeTimers()
    let n = 0
    const calls: string[] = []
    const fetchFn = vi.fn(async (url: string) => {
      calls.push(url)
      await new Promise(resolve => setTimeout(resolve, 10))
      const s = statuses(n++)
      if (s instanceof Error) throw s
      return new Response('{}', { status: s })
    })
    const result = runStage('http://localhost:3000', plates, 2, 1, fetchFn)
    return vi.advanceTimersByTimeAsync(1100).then(async () => ({ result: await result, calls }))
  }

  it('counts successes and requests the encoded plate url', async () => {
    const { result, calls } = await run(() => 200, ['AA 12'])
    expect(result.errorPct).toBe(0)
    expect(result.throttled).toBe(0)
    expect(result.rps).toBeGreaterThan(0)
    expect(calls[0]).toBe('http://localhost:3000/api/plate/AA%2012')
  })

  it('counts 429 as throttled, not as an error', async () => {
    const { result } = await run(() => 429)
    expect(result.throttled).toBeGreaterThan(0)
    expect(result.errorPct).toBe(0)
  })

  it('counts 5xx and network failures as errors, 404 as success', async () => {
    const a = await run(() => 503)
    expect(a.result.errorPct).toBe(100)
    const b = await run(() => new Error('boom'))
    expect(b.result.errorPct).toBe(100)
    const c = await run(() => 404)
    expect(c.result.errorPct).toBe(0)
  })
})
