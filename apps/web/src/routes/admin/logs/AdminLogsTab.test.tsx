import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminLogsResponse } from '@carplates/shared'

import { i18nReady } from '@/i18n'
import AdminLogsTab from './AdminLogsTab'
import { mergeLiveLines, parseFilters, prettyMessage } from './helpers'

await i18nReady

const api = vi.hoisted(() => ({ getAdminLogs: vi.fn(), getAdminLogContainers: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getAdminLogs: api.getAdminLogs,
  getAdminLogContainers: api.getAdminLogContainers
}))

const line = (ts: string, message: string, level: 'error' | 'info' = 'info'): AdminLogsResponse['lines'][number] => ({
  ts,
  container: 'carsua-api-blue-1',
  level,
  message
})

const logs = (lines: AdminLogsResponse['lines'], status: AdminLogsResponse['status'] = 'ok'): AdminLogsResponse => ({
  status,
  lines,
  truncated: false,
  from: '2026-11-27T10:00:00.000Z',
  to: '2026-11-27T11:00:00.000Z'
})

function renderTab(url = '/admin?tab=logs'): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <AdminLogsTab />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminLogsTab', () => {
  beforeEach(() => {
    api.getAdminLogs.mockReset()
    api.getAdminLogContainers.mockReset()
    api.getAdminLogContainers.mockResolvedValue({ status: 'ok', containers: ['carsua-api-blue-1', 'carsua-caddy-1'] })
  })

  it('lists lines newest first with a level badge and expands the parsed JSON on click', async () => {
    api.getAdminLogs.mockResolvedValue(
      logs([
        line('2026-11-27T10:30:00.500Z', '{"msg":"GET /api/plate/AA****BB"}', 'error'),
        line('2026-11-27T10:29:00.000Z', 'boot')
      ])
    )
    renderTab()
    const first = await screen.findByText('{"msg":"GET /api/plate/AA****BB"}')
    expect(within(screen.getByRole('list')).getByText('error')).toBeInTheDocument()
    fireEvent.click(first)
    expect(screen.getByText(/"msg": "GET \/api\/plate\/AA\*\*\*\*BB"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('sends the URL filters to the api', async () => {
    api.getAdminLogs.mockResolvedValue(logs([]))
    renderTab('/admin?tab=logs&container=carsua-caddy-1&level=error,warn&q=timeout&range=6h')
    expect(await screen.findByText('No lines match these filters.')).toBeInTheDocument()
    const query = api.getAdminLogs.mock.calls[0]?.[0]
    expect(query).toMatchObject({
      container: 'carsua-caddy-1',
      level: 'error,warn',
      q: 'timeout',
      direction: 'backward'
    })
    expect(typeof query.from).toBe('string')
  })

  it('shows the disabled and unavailable states', async () => {
    api.getAdminLogs.mockResolvedValue(logs([], 'disabled'))
    renderTab()
    expect(await screen.findByText(/LOKI_URL is not set/)).toBeInTheDocument()
  })

  it('shows unavailable when Loki is down', async () => {
    api.getAdminLogs.mockResolvedValue(logs([], 'unavailable'))
    renderTab()
    expect(await screen.findByText(/Loki is not answering/)).toBeInTheDocument()
  })

  it('polls only newer lines in live mode and keeps the old ones', async () => {
    api.getAdminLogs.mockResolvedValueOnce(logs([line('2026-11-27T10:30:00.000Z', 'older')]))
    api.getAdminLogs.mockResolvedValue(
      logs([line('2026-11-27T10:30:05.000Z', 'newer'), line('2026-11-27T10:30:00.000Z', 'older')])
    )
    renderTab('/admin?tab=logs&live=1')
    expect(await screen.findByText('older')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('newer')).toBeInTheDocument()
    expect(screen.getAllByText('older')).toHaveLength(1)
    await waitFor(() => expect(api.getAdminLogs).toHaveBeenCalledTimes(2))
    expect(api.getAdminLogs.mock.calls[1]?.[0].from).toBe('2026-11-27T10:30:00.000Z')
  })
})

describe('log helpers', () => {
  it('ignores invalid URL params', () => {
    const f = parseFilters(new URLSearchParams('container=a"b&level=error,bogus&range=nope&from=x&live=1'))
    expect(f).toMatchObject({ container: undefined, levels: ['error'], range: '1h', from: undefined, live: true })
  })

  it('does not allow live with a custom range', () => {
    expect(parseFilters(new URLSearchParams('range=custom&live=1')).live).toBe(false)
  })

  it('merge drops lines already shown and caps the list', () => {
    const a = logs([line('2026-11-27T10:00:01.000Z', 'b'), line('2026-11-27T10:00:00.000Z', 'a')])
    const b = logs([line('2026-11-27T10:00:02.000Z', 'c'), line('2026-11-27T10:00:01.000Z', 'b')])
    expect(mergeLiveLines(a, b).lines.map(l => l.message)).toEqual(['c', 'b', 'a'])
    expect(mergeLiveLines(a, b, 2).lines.map(l => l.message)).toEqual(['c', 'b'])
    expect(mergeLiveLines(a, b, 2).truncated).toBe(true)
  })

  it('pretty-prints JSON messages only', () => {
    expect(prettyMessage('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(prettyMessage('{broken')).toBe('{broken')
    expect(prettyMessage('plain')).toBe('plain')
  })
})
