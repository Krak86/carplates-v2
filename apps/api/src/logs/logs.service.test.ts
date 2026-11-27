import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminLogsQuery } from '@carplates/shared'

import { LogsService } from './logs.service.js'

const env = vi.hoisted(() => ({}) as { LOKI_URL?: string })
vi.mock('../env.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../env.js')>()),
  loadEnv: () => env
}))

const base: AdminLogsQuery = { limit: 2, direction: 'backward' }
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const streams = (...result: unknown[]) => ({ status: 'success', data: { resultType: 'streams', result } })

describe('LogsService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    env.LOKI_URL = 'http://loki:3100'
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('answers "disabled" without LOKI_URL and never calls out', async () => {
    env.LOKI_URL = undefined
    const res = await new LogsService().query(base, 'u1')
    expect(res).toMatchObject({ status: 'disabled', lines: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('queries query_range with the built LogQL, a 24 h cap and limit + 1', async () => {
    fetchMock.mockResolvedValue(json(streams()))
    await new LogsService().query(
      {
        ...base,
        container: 'carsua-api-blue-1',
        q: 'x" or {a',
        from: '2026-01-01T00:00:00Z',
        to: '2026-11-27T00:00:00Z'
      },
      'u1'
    )
    const url = new URL(String((fetchMock.mock.calls[0] as [URL])[0]))
    expect(url.origin + url.pathname).toBe('http://loki:3100/loki/api/v1/query_range')
    expect(url.searchParams.get('query')).toBe('{container="carsua-api-blue-1"} |~ "(?i)x\\" or \\\\{a"')
    expect(url.searchParams.get('limit')).toBe('3')
    expect(url.searchParams.get('direction')).toBe('backward')
    const span = (Number(url.searchParams.get('end')) - Number(url.searchParams.get('start'))) / 1e6
    expect(span).toBe(24 * 3_600_000)
  })

  it('merges streams newest first, trims to the limit, flags truncation and re-redacts', async () => {
    fetchMock.mockResolvedValue(
      json(
        streams(
          {
            stream: { container: 'carsua-api-blue-1', level: 'info' },
            values: [
              ['1700000003000000000', 'lookup AA1234BB'],
              ['1700000001000000000', 'old']
            ]
          },
          {
            stream: { container: 'carsua-caddy-1', level: 'weird' },
            values: [['1700000002000000000', 'mail roman@gmail.com']]
          }
        )
      )
    )
    const res = await new LogsService().query(base, 'u1')
    expect(res.status).toBe('ok')
    expect(res.truncated).toBe(true)
    expect(res.lines.map(l => l.ts)).toEqual(['2023-11-14T22:13:23.000Z', '2023-11-14T22:13:22.000Z'])
    expect(res.lines[0]?.message).toBe('lookup AA****BB')
    expect(res.lines[1]).toMatchObject({ container: 'carsua-caddy-1', level: 'info', message: 'mail r***@g***.com' })
  })

  it('orders oldest first for direction=forward', async () => {
    fetchMock.mockResolvedValue(
      json(
        streams({
          stream: { container: 'c', level: 'warn' },
          values: [
            ['3', 'c'],
            ['1', 'a'],
            ['2', 'b']
          ]
        })
      )
    )
    const res = await new LogsService().query({ ...base, limit: 5, direction: 'forward' }, 'u1')
    expect(res.lines.map(l => l.message)).toEqual(['a', 'b', 'c'])
    expect(res.truncated).toBe(false)
  })

  it('tolerates structured metadata as a third tuple item', async () => {
    fetchMock.mockResolvedValue(json(streams({ stream: { container: 'c', level: 'info' }, values: [['1', 'a', {}]] })))
    expect((await new LogsService().query(base, 'u1')).lines).toHaveLength(1)
  })

  it('returns "unavailable" when Loki is down, errors or answers garbage', async () => {
    for (const setup of [
      () => fetchMock.mockRejectedValue(new Error('ECONNREFUSED')),
      () => fetchMock.mockResolvedValue(json({}, 503)),
      () =>
        fetchMock.mockResolvedValue(json({ status: 'success', data: { result: [{ stream: {}, values: [['x', 1]] }] } }))
    ]) {
      setup()
      const res = await new LogsService().query(base, 'u1')
      expect(res).toMatchObject({ status: 'unavailable', lines: [], truncated: false })
    }
  })

  it('lists container names, sorted, and degrades to "unavailable"', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'success', data: ['carsua-b', 'carsua-a'] }))
    expect(await new LogsService().containers()).toEqual({ status: 'ok', containers: ['carsua-a', 'carsua-b'] })
    fetchMock.mockRejectedValueOnce(new Error('down'))
    expect(await new LogsService().containers()).toEqual({ status: 'unavailable', containers: [] })
  })
})
