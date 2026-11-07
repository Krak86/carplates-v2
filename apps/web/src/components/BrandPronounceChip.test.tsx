import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'

await i18nReady

const api = vi.hoisted(() => ({ getCatalogLookup: vi.fn() }))
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...api
}))

import BrandPronounceChip from '@/components/BrandPronounceChip'

function renderChip(brand: string | null, model: string | null): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <BrandPronounceChip brand={brand} model={model} />
    </QueryClientProvider>
  )
}

describe('BrandPronounceChip', () => {
  afterEach(cleanup)

  it('renders the speaker button when the lookup names a make', async () => {
    api.getCatalogLookup.mockResolvedValue({ pronounce: 'skoda' })
    renderChip('SKODA', 'Octavia')
    expect(await screen.findByRole('button')).toBeTruthy()
  })

  it('renders nothing when the make has no pronunciation', async () => {
    api.getCatalogLookup.mockResolvedValue({ pronounce: null })
    renderChip('LADA', 'Niva')
    await waitFor(() => expect(api.getCatalogLookup).toHaveBeenCalled())
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('does not query without a brand and model', () => {
    api.getCatalogLookup.mockClear()
    renderChip(null, null)
    expect(api.getCatalogLookup).not.toHaveBeenCalled()
  })
})
