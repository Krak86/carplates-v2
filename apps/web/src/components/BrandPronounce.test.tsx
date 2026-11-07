import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    expect(screen.getAllByText('Шко́да')).toHaveLength(2)
    expect(screen.getByText(/\/ˈʃkoda\/ \(.+\)/)).toBeTruthy()
  })

  it('shows an error line when the request fails', async () => {
    api.getBrandPronunciation.mockRejectedValue(new Error('404'))
    renderButton()
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText(/Could not load|Не вдалося|Не удалось/, {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('brand-pronounce helpers', () => {
  it('names the IPA language only for a native fallback', () => {
    expect(ipaLangName(null, 'en')).toBeNull()
    expect(ipaLangName('en', 'en')).toBeNull()
    expect(ipaLangName('de', 'en')).toBe('German')
    expect(ipaLangName('xx-not-a-lang!', 'en')).toBeNull()
  })

  it('drops rows with neither respelling nor IPA', () => {
    const items = [{ lang: 'ua', ipa: null, ipaLang: null, respell: null }, ...SKODA.items] as never
    expect(visibleItems(items)).toHaveLength(3)
  })
})
