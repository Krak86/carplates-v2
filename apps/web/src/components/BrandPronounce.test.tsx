import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ipaLangName, visibleItems } from '@/components/brand-pronounce/helpers'
import { i18nReady } from '@/i18n'

await i18nReady

const api = vi.hoisted(() => ({ getBrandPronunciation: vi.fn() }))
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...api
}))

import BrandPronounce from '@/components/BrandPronounce'

const SKODA = {
  slug: 'skoda',
  items: [
    { lang: 'ua', ipa: null, ipaLang: null, respell: 'Шко́да' },
    { lang: 'ru', ipa: null, ipaLang: null, respell: 'Шко́да' },
    { lang: 'en', ipa: 'ˈʃkoda', ipaLang: 'cs', respell: 'SHKOH-da' }
  ]
}

function renderButton(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <BrandPronounce slug="skoda" name="Skoda" />
    </QueryClientProvider>
  )
}

describe('BrandPronounce', () => {
  beforeEach(() => {
    api.getBrandPronunciation.mockReset().mockResolvedValue(SKODA)
  })

  it('does not fetch until the popover is opened', () => {
    renderButton()
    expect(api.getBrandPronunciation).not.toHaveBeenCalled()
  })

  it('fetches on click and shows the respelling and the labelled native IPA', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText('SHKOH-da', {}, { timeout: 5000 })).toBeTruthy()
    expect(api.getBrandPronunciation).toHaveBeenCalledWith('skoda')
    expect(screen.queryByText('Шко́да')).toBeNull()
    expect(screen.getByText(/\/ˈʃkoda\/ \(.+\)/)).toBeTruthy()
  })

  it('shows an error line when the request fails', async () => {
    api.getBrandPronunciation.mockRejectedValue(new Error('404'))
    renderButton()
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText(/Could not load|Не вдалося|Не удалось/, {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('BrandPronounce audio', () => {
  afterEach(cleanup)

  const play = vi.fn().mockResolvedValue(undefined)
  const created: string[] = []

  beforeEach(() => {
    play.mockClear()
    created.length = 0
    vi.stubGlobal(
      'Audio',
      class {
        paused = true
        currentTime = 0
        preload = ''
        constructor(url: string) {
          created.push(url)
        }
        play = play
        pause = vi.fn()
      }
    )
  })

  it('shows the credit, loads the clip only on press', async () => {
    api.getBrandPronunciation.mockResolvedValue({
      ...SKODA,
      audio: { lang: 'cs', url: 'https://x/Cs-Skoda.ogg', author: 'Miaow', license: 'CC BY-SA 3.0', kind: 'commons' }
    })
    renderButton()
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText(/Miaow, CC BY-SA 3.0/, {}, { timeout: 5000 })).toBeTruthy()
    expect(created).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /Listen|Послухати|Послушать/ }))
    expect(created).toEqual(['https://x/Cs-Skoda.ogg'])
    expect(play).toHaveBeenCalledOnce()
  })

  it('has no play button without audio', async () => {
    api.getBrandPronunciation.mockResolvedValue(SKODA)
    renderButton()
    fireEvent.click(screen.getByRole('button'))
    await screen.findByText('SHKOH-da', {}, { timeout: 5000 })
    expect(screen.queryByRole('button', { name: /Listen|Послухати|Послушать/ })).toBeNull()
  })
})

describe('brand-pronounce helpers', () => {
  it('names the IPA language only for a native fallback', () => {
    expect(ipaLangName(null, 'en')).toBeNull()
    expect(ipaLangName('en', 'en')).toBeNull()
    expect(ipaLangName('de', 'en')).toBe('German')
    expect(ipaLangName('xx-not-a-lang!', 'en')).toBeNull()
  })

  it('keeps only the UI language row, falling back to every row that has content', () => {
    const items = [
      { lang: 'ua', ipa: null, ipaLang: null, respell: null },
      { lang: 'ru', ipa: null, ipaLang: null, respell: 'Шкода' },
      { lang: 'en', ipa: 'ˈʃkoda', ipaLang: 'cs', respell: null }
    ] as never
    expect(visibleItems(items, 'ru').map(i => i.lang)).toEqual(['ru'])
    expect(visibleItems(items, 'ua').map(i => i.lang)).toEqual(['ru', 'en'])
  })
})
