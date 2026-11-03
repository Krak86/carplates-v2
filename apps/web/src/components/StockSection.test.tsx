import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import StockSection from '@/components/StockSection'

await i18nReady

const api = vi.hoisted(() => ({ getMarket: vi.fn(), getWikiImage: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getMarket: api.getMarket,
  getWikiImage: api.getWikiImage
}))
vi.mock('@/components/use-stock-photos-actions', () => ({
  useStockPhotosActions: (): unknown => ({
    fresh: [{ model: 'CEED', year: 2026, image: { url: 'https://img.example/new.jpg', attribution: null } }],
    used: [],
    isPending: false
  })
}))

function renderSection(props: { kind?: string | null; model?: string | null } = {}): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <StockSection
          brand="KIA"
          model={props.model === undefined ? 'CEED' : props.model}
          year={2012}
          kind={props.kind}
        />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

const open = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /Show cars in stock/ }))
}

describe('StockSection market block', () => {
  beforeEach(() => {
    api.getMarket.mockReset()
    api.getWikiImage.mockReset()
    api.getWikiImage.mockResolvedValue({ image: null })
  })

  it('asks CarAPIS nothing until the section is opened', async () => {
    api.getMarket.mockResolvedValue({ kind: 'none', items: [] })
    renderSection()
    expect(api.getMarket).not.toHaveBeenCalled()
    open()
    await waitFor(() => expect(api.getMarket).toHaveBeenCalledWith('KIA', 'CEED', 'passenger'))
  })

  it('puts the listings first and labels the importer rows below', async () => {
    api.getMarket.mockResolvedValue({
      kind: 'ua',
      items: [{ id: '00000001-aaaa', source: 'auto_ria_ua', sourceName: 'Auto.ria', year: 2012, priceUsd: 7001 }]
    })
    renderSection()
    open()
    const price = await screen.findByText('$7,001')
    const official = screen.getByText('From the official KIA site')
    expect(price.compareDocumentPosition(official) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('looks as before when there is nothing to show', async () => {
    api.getMarket.mockResolvedValue({ kind: 'none', items: [] })
    renderSection()
    open()
    await waitFor(() => expect(api.getMarket).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Cars for sale')).toBeNull())
    expect(screen.queryByText('From the official KIA site')).toBeNull()
  })

  it('never requests for a model-less make page or an unsupported kind', () => {
    renderSection({ model: null })
    open()
    expect(api.getMarket).not.toHaveBeenCalled()
  })

  it('never requests for a motorcycle', () => {
    renderSection({ kind: 'motorcycle' })
    open()
    expect(api.getMarket).not.toHaveBeenCalled()
  })
})
