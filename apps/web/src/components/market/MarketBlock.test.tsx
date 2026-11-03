import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MarketCard } from '@carplates/shared'

import { i18nReady } from '@/i18n'
import MarketBlock from './MarketBlock'
import type { MarketView } from './types'

await i18nReady

const api = vi.hoisted(() => ({ getMarketDetail: vi.fn(), getWikiImage: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getMarketDetail: api.getMarketDetail,
  getWikiImage: api.getWikiImage
}))

const card = (n: number, extra: Partial<MarketCard> = {}): MarketCard => ({
  id: `0000000${n}-aaaa-bbbb`,
  source: 'auto_ria_ua',
  sourceName: 'Auto.ria',
  country: 'UA',
  year: 2012,
  priceUsd: 7000 + n,
  mileage: 150000,
  fuel: 'gasoline',
  region: 'Kyiv',
  lastSeenAt: '2026-11-02T08:00:00Z',
  ...extra
})

const view = (cards: MarketCard[], extra: Partial<MarketView> = {}): MarketView => ({
  dataset: 'ua',
  cards,
  stale: false,
  fetchedAt: '2026-11-03T10:00:00Z',
  budget: null,
  ...extra
})

function renderBlock(v: MarketView): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ui: ReactNode = (
    <QueryClientProvider client={client}>
      <MarketBlock view={v} brandName="Kia" brand="KIA" model="CEED" kind={null} year={2012} />
    </QueryClientProvider>
  )
  return render(ui)
}

describe('MarketBlock', () => {
  beforeEach(() => {
    api.getMarketDetail.mockReset()
    api.getWikiImage.mockReset()
    api.getWikiImage.mockResolvedValue({ image: null })
  })

  it('shows the dataset chips, the cards and the attribution', () => {
    renderBlock(view([card(1), card(2)]))
    expect(screen.getByText('Cars for sale')).toBeInTheDocument()
    expect(screen.getByText('Ukraine')).toBeInTheDocument()
    expect(screen.getByText('via CarAPIS')).toBeInTheDocument()
    expect(screen.getByText('$7,001')).toBeInTheDocument()
    expect(screen.getAllByText(/Auto\.ria/).length).toBeGreaterThan(1)
    expect(screen.getByText(/Data from CarAPIS/)).toBeInTheDocument()
    expect(screen.getAllByText(/150,000 km · petrol/)).toHaveLength(2)
  })

  it('explains the European fallback and prints the budget counter and stale note', () => {
    renderBlock(
      view([card(1, { country: 'DE', sourceName: 'Kleinanzeigen' })], {
        dataset: 'eu',
        stale: true,
        budget: { used: 37, limit: 100 }
      })
    )
    expect(screen.getByText('Europe')).toBeInTheDocument()
    expect(screen.getByText(/Few listings were found in Ukraine/)).toBeInTheDocument()
    expect(screen.getByText(/CarAPIS requests today: 37 \/ 100/)).toBeInTheDocument()
    expect(screen.getByText(/may be out of date/)).toBeInTheDocument()
  })

  it('has no counter when the API hides the budget', () => {
    renderBlock(view([card(1)]))
    expect(screen.queryByText(/requests today/)).toBeNull()
  })

  it('folds cards past the visible limit behind show more', () => {
    renderBlock(view(Array.from({ length: 8 }, (_, i) => card(i + 1))))
    expect(screen.getAllByRole('button', { name: /\$/ })).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Show more (2)' }))
    expect(screen.getAllByRole('button', { name: /\$/ })).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()
  })

  it('falls back to a text tile when a card has no photo and no model photo exists', () => {
    renderBlock(view([card(1, { thumb: null })]))
    expect(screen.queryByText('Illustrative photo')).toBeNull()
    expect(screen.getByText('2012 CEED')).toBeInTheDocument()
  })

  it('uses the shared model photo, marked illustrative, when the thumbnail is missing', async () => {
    api.getWikiImage.mockResolvedValue({
      image: { url: 'https://upload.example/ceed.jpg', attribution: { author: 'Jane', license: 'CC BY' } }
    })
    renderBlock(view([card(1, { thumb: null })]))
    expect(await screen.findByText('Illustrative photo')).toBeInTheDocument()
    expect(screen.getByText(/Jane · CC BY/)).toBeInTheDocument()
  })

  it('opens the detail modal with the redirect link, then closes it', async () => {
    api.getMarketDetail.mockResolvedValue({
      id: card(1).id,
      source: 'auto_ria_ua',
      sourceName: 'Auto.ria',
      description: 'Clean car.',
      photos: [],
      engineCc: 1600,
      ownerCount: 2,
      isUndervalued: true
    })
    renderBlock(view([card(1)]))
    fireEvent.click(screen.getByRole('button', { name: /\$7,001/ }))

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(screen.getByText('Clean car.')).toBeInTheDocument())
    expect(api.getMarketDetail).toHaveBeenCalledWith(card(1).id)
    expect(screen.getByText('1600 cc')).toBeInTheDocument()
    expect(screen.getByText('Below market price')).toBeInTheDocument()
    expect(screen.getByText(/machine-written/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open on Auto\.ria/ })
    expect(link).toHaveAttribute('href', `/api/market/go/${card(1).id}`)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    expect(dialog).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the modal useful when the detail request fails', async () => {
    api.getMarketDetail.mockRejectedValue(new Error('429'))
    renderBlock(view([card(1)]))
    fireEvent.click(screen.getByRole('button', { name: /\$7,001/ }))
    expect(await screen.findByText(/Could not load the details/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open on Auto\.ria/ })).toBeInTheDocument()
  })
})
