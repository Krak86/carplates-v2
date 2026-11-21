import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { labOf, PAINT_HEX } from '@carplates/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import WikiHeroImage from '@/components/WikiHeroImage'
import { useUiStore } from '@/store/ui-store'

await i18nReady

const PHOTO = 'https://upload.example/car.jpg'
const api = vi.hoisted(() => ({
  getWikiImage: vi.fn(),
  getWikiRecolor: vi.fn(),
  getWikiPaintMask: vi.fn(),
  getWikiPhotos: vi.fn()
}))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getWikiImage: api.getWikiImage,
  getWikiRecolor: api.getWikiRecolor,
  getWikiPaintMask: api.getWikiPaintMask,
  getWikiPhotos: api.getWikiPhotos
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
    api.getWikiPhotos.mockReset().mockResolvedValue({ photos: [] })
    useUiStore.setState({ wikiRecolorEnabled: true })
  })

  it('shows the pill and the canvas when a filter applies', async () => {
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    expect(pill()?.getAttribute('aria-pressed')).toBe('true')
  })

  it('swipes to the original photo (no canvas, no pill) and back', async () => {
    await renderHero('ЧЕРВОНИЙ')
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Next photo' })[0]!)
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
    expect(pill()).toBeNull()
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

function photo(n: number, colorMatch: boolean): unknown {
  return {
    url: `https://upload.example/p${n}.jpg`,
    width: 1280,
    height: 853,
    title: `File:Kia Ceed ${n}.jpg`,
    year: 2012,
    bucket: colorMatch ? 'red' : 'white',
    colorMatch,
    attribution: { author: 'Ann', license: 'CC BY-SA 4.0', licenseUrl: null }
  }
}

function renderWithPhotos(color: string | null): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WikiHeroImage brand="KIA" model="CEED" year={2012} rawKind="LIGHT" vehicleKey="K1" color={color} />
    </QueryClientProvider>
  )
}

describe('WikiHeroImage extra photos', () => {
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
    api.getWikiPhotos.mockReset().mockResolvedValue({ photos: [photo(1, false), photo(2, true), photo(3, true)] })
    useUiStore.setState({ wikiRecolorEnabled: true })
  })

  it('uses the first colour-matched photo as the hero: no filter, other-car credit, dots for every photo', async () => {
    renderWithPhotos('ЧЕРВОНИЙ')
    // The stored hero does not wait for the photo list; the colour match replaces it as soon as the list arrives.
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p2.jpg')
    )
    act(() => {
      fireEvent.load(screen.getByAltText('KIA CEED'))
    })
    expect(await screen.findByText('Photo of another car of this model: Ann, CC BY-SA 4.0')).toBeTruthy()
    expect(pill()).toBeNull()
    expect(screen.queryByTestId('wiki-recolor-canvas')).toBeNull()
    expect(api.getWikiRecolor).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Update photo' })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Photo \d of 3$/ })).toHaveLength(3)
  })

  it('keeps the stored hero and the filter when no photo matches the colour', async () => {
    api.getWikiPhotos.mockResolvedValue({ photos: [photo(1, false)] })
    renderWithPhotos('ЧЕРВОНИЙ')
    const hero = await screen.findByAltText('KIA CEED')
    expect(hero.getAttribute('src')).toBe(PHOTO)
    act(() => {
      fireEvent.load(hero)
    })
    await waitFor(() => expect(screen.getByTestId('wiki-recolor-canvas')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: /^Photo \d of 3$/ })).toHaveLength(3)
  })

  it('falls to the next matched photo, then to the stored hero, when a matched photo fails to load', async () => {
    api.getWikiPhotos.mockResolvedValue({ photos: [photo(2, true), photo(3, true)] })
    renderWithPhotos('ЧЕРВОНИЙ')
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p2.jpg')
    )
    const first = screen.getByAltText('KIA CEED')
    act(() => {
      fireEvent.error(first)
    })
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p3.jpg')
    )
    act(() => {
      fireEvent.error(screen.getByAltText('KIA CEED'))
    })
    await waitFor(() => expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe(PHOTO))
  })

  it('keeps the stored hero when the photo request fails', async () => {
    api.getWikiPhotos.mockRejectedValue(new Error('500'))
    renderWithPhotos('ЧЕРВОНИЙ')
    const hero = await screen.findByAltText('KIA CEED')
    expect(hero.getAttribute('src')).toBe(PHOTO)
  })

  it('a non-scrolling thumbnail strip, dots, arrows and a swipe all move through the photos', async () => {
    api.getWikiPhotos.mockResolvedValue({ photos: [1, 2, 3, 4, 5, 6].map(n => photo(n, false)) })
    renderWithPhotos(null)
    const heroImg = await screen.findByAltText('KIA CEED')
    act(() => {
      fireEvent.load(heroImg)
    })
    const dot = await screen.findByRole('button', { name: 'Photo 4 of 7' })
    expect(screen.getAllByRole('button', { name: /^Photo \d of 7$/ })).toHaveLength(7)
    const thumbs = screen.getAllByRole('button', { name: /^Open photo \d of 7$/ })
    expect(thumbs).toHaveLength(7)
    expect(thumbs[0]!.closest('ul')!.className).toContain('overflow-hidden')
    fireEvent.click(dot)
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p3.jpg')
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p4.jpg')
    )
    const hero = screen.getByAltText('KIA CEED').parentElement!
    fireEvent.pointerDown(hero, { pointerType: 'touch', clientX: 200, clientY: 50 })
    fireEvent.pointerUp(hero, { pointerType: 'touch', clientX: 100, clientY: 55 })
    await waitFor(() =>
      expect(screen.getByAltText('KIA CEED').getAttribute('src')).toBe('https://upload.example/p5.jpg')
    )
  })

  it('with a single photo: one selected thumbnail, no arrows and no dots', async () => {
    api.getWikiPhotos.mockResolvedValue({ photos: [] })
    renderWithPhotos(null)
    const hero = await screen.findByAltText('KIA CEED')
    act(() => {
      fireEvent.load(hero)
    })
    expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Photo \d of/ })).toBeNull()
    const thumb = await screen.findByRole('button', { name: 'Open photo 1 of 1' })
    expect(thumb.getAttribute('aria-current')).toBe('true')
  })
})
