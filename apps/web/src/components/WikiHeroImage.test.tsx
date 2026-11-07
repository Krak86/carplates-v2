import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { labOf, PAINT_HEX } from '@carplates/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import WikiHeroImage from '@/components/WikiHeroImage'
import { useUiStore } from '@/store/ui-store'

await i18nReady

const PHOTO = 'https://upload.example/car.jpg'
const api = vi.hoisted(() => ({ getWikiImage: vi.fn(), getWikiRecolor: vi.fn(), getWikiPaintMask: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getWikiImage: api.getWikiImage,
  getWikiRecolor: api.getWikiRecolor,
  getWikiPaintMask: api.getWikiPaintMask
}))

function recolorFor(imageUrl: string): unknown {
  return {
    recolor: {
      imageUrl,
      bucket: 'white',
      lab: [...labOf(PAINT_HEX.white)],
      maskUrl: '/api/wiki/paint/abc.webp?v=1',
      w: 4,
      h: 2
    }
  }
}

async function renderHero(color: string | null): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WikiHeroImage brand="KIA" model="CEED" year={2012} rawKind="LIGHT" vehicleKey="K1" color={color} />
    </QueryClientProvider>
  )
  const img = await screen.findByRole('img')
  act(() => {
    fireEvent.load(img)
  })
}

const pill = (): HTMLElement | null => screen.queryByRole('button', { name: /Colour filter/ })

describe('WikiHeroImage colour filter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      }
    )
    api.getWikiImage.mockReset().mockResolvedValue({ image: { url: PHOTO, attribution: null }, from: 'db' })
    api.getWikiRecolor.mockReset().mockResolvedValue(recolorFor(PHOTO))
    api.getWikiPaintMask.mockReset().mockResolvedValue({ w: 4, h: 2, data: new Uint8ClampedArray(32) })
    useUiStore.setState({ wikiRecolorEnabled: true })
  })

  it('shows the pill, the canvas and the note when a filter applies', async () => {
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    expect(pill()?.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/Photo of another car with a colour filter: red/)).toBeTruthy()
  })

  it('swipes to the original photo (no canvas, no note) and back', async () => {
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Next photo' })[0]!)
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
    expect(screen.queryByText(/Photo of another car with a colour filter/)).toBeNull()
    expect(pill()?.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getAllByRole('button', { name: 'Previous photo' })[0]!)
    expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy()
  })

  it('with lot photos: model photo slide with the filter, then the original slide', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <WikiHeroImage
          brand="KIA"
          model="CEED"
          year={2012}
          rawKind="LIGHT"
          vehicleKey="K1"
          color="ЧЕРВОНИЙ"
          lotPhotos={['a'.repeat(32)]}
        />
      </QueryClientProvider>
    )
    const next = await screen.findAllByRole('button', { name: 'Next photo' }).then(b => b[0]!)
    fireEvent.click(next)
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    expect(pill()?.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(next)
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
    expect(pill()).toBeNull()
  })

  it('has no pill without a registry colour', async () => {
    await renderHero(null)
    expect(pill()).toBeNull()
    expect(api.getWikiRecolor).not.toHaveBeenCalled()
  })

  it('has no pill when the registry colour is close to the photographed paint', async () => {
    await renderHero('БІЛИЙ')
    await waitFor(() => expect(api.getWikiRecolor).toHaveBeenCalled())
    expect(pill()).toBeNull()
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
  })

  it('has no pill when the scan belongs to another photo than the hero', async () => {
    api.getWikiRecolor.mockResolvedValue(recolorFor('https://upload.example/other.jpg'))
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(api.getWikiRecolor).toHaveBeenCalled())
    expect(pill()).toBeNull()
  })

  it('drops the pill when the mask fails to load', async () => {
    api.getWikiPaintMask.mockRejectedValue(new Error('mask 404'))
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(api.getWikiPaintMask).toHaveBeenCalled())
    await waitFor(() => expect(pill()).toBeNull())
  })

  it('has no pill when the recolor request fails', async () => {
    api.getWikiRecolor.mockRejectedValue(new Error('500'))
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(api.getWikiRecolor).toHaveBeenCalled())
    expect(pill()).toBeNull()
  })

  it('keeps the pill but draws nothing and skips the mask while switched off', async () => {
    useUiStore.setState({ wikiRecolorEnabled: false })
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(pill()?.getAttribute('aria-pressed')).toBe('false'))
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
    expect(api.getWikiPaintMask).not.toHaveBeenCalled()
  })

  it('toggles the filter off from the pill', async () => {
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    fireEvent.click(pill()!)
    await waitFor(() => expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull())
    expect(pill()?.getAttribute('aria-pressed')).toBe('false')
  })
})
