import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminServerResponse } from '@carplates/shared'

import { i18nReady } from '@/i18n'
import AdminServerTab from './AdminServerTab'

await i18nReady

const api = vi.hoisted(() => ({ getAdminServer: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getAdminServer: api.getAdminServer
}))

const server = (market?: AdminServerResponse['market']): AdminServerResponse => ({
  cpuCores: 4,
  cpuModel: 'Test CPU',
  memTotalBytes: 8 * 1024 ** 3,
  diskTotalBytes: null,
  diskUsedBytes: null,
  uptimeSeconds: 3600,
  processUptimeSeconds: 600,
  load: [0.1, 0.2, 0.3],
  nodeVersion: 'v24.0.0',
  platform: 'Linux',
  users: 3,
  dbSizeBytes: null,
  dbConnections: null,
  samples: [],
  market
})

function renderTab(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AdminServerTab />
    </QueryClientProvider>
  )
}

describe('AdminServerTab market tile', () => {
  beforeEach(() => api.getAdminServer.mockReset())

  it('shows the CarAPIS requests used today with the cache and dataset split', async () => {
    api.getAdminServer.mockResolvedValue(server({ used: 21, limit: 100, cacheHits: 7, ua: 4, eu: 2 }))
    renderTab()
    expect(await screen.findByText('21 / 100')).toBeInTheDocument()
    expect(screen.getByText('CarAPIS requests today (UTC)')).toBeInTheDocument()
    expect(screen.getByText('cache hits: 7, Ukraine: 4, Europe: 2')).toBeInTheDocument()
  })

  it('has no tile when the feature is off', async () => {
    api.getAdminServer.mockResolvedValue(server(null))
    renderTab()
    expect(await screen.findByText('Test CPU', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(/CarAPIS requests/)).toBeNull()
  })
})
