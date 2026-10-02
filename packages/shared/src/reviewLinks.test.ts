import { describe, expect, it } from 'vitest'

import { reviewLinks } from './reviewLinks.js'

function urls(brand: string | null, model: string | null): Record<string, string> {
  return Object.fromEntries(reviewLinks(brand, model).map(l => [l.site, l.url]))
}

describe('reviewLinks', () => {
  it('builds each site’s own model/search URL', () => {
    expect(urls('SKODA', 'OCTAVIA')).toEqual({
      'infocar-test-drive': 'https://www.infocar.ua/test-drive/skoda/octavia/',
      'infocar-reviews': 'https://www.infocar.ua/reviews/skoda/octavia/',
      'auto-blog': 'https://auto-blog.com.ua/uk/?s=SKODA%20OCTAVIA',
      drive2: 'https://www.drive2.ru/search?text=SKODA%20OCTAVIA'
    })
  })

  it('slugs a multi-word Latin model with hyphens', () => {
    expect(urls('SKODA', 'ENYAQ IV')['infocar-test-drive']).toBe('https://www.infocar.ua/test-drive/skoda/enyaq-iv/')
  })

  it('falls back to the brand page when the model is missing or not plain Latin', () => {
    expect(urls('FORD', null)['infocar-reviews']).toBe('https://www.infocar.ua/reviews/ford/')
    expect(urls('FORD', 'Фокус')['infocar-reviews']).toBe('https://www.infocar.ua/reviews/ford/')
    expect(urls('FORD', 'F-150 / RAPTOR')['infocar-reviews']).toBe('https://www.infocar.ua/reviews/ford/')
  })

  it('collapses the registry double-space brand/model separator', () => {
    const result = urls('MERCEDES-BENZ  VITO', null)
    expect(result['infocar-test-drive']).toBe('https://www.infocar.ua/test-drive/mercedes-benz/')
    expect(result.drive2).toBe('https://www.drive2.ru/search?text=MERCEDES-BENZ%20VITO')
  })

  it('omits infocar links for a brand with no known slug but keeps the searches', () => {
    expect(Object.keys(urls('МУССТАНГ', 'X'))).toEqual(['auto-blog', 'drive2'])
  })

  it('tags drive2 as Russian and the rest as Ukrainian', () => {
    const links = reviewLinks('TOYOTA', 'CAMRY')
    expect(links.find(l => l.site === 'drive2')?.lang).toBe('ru')
    expect(links.filter(l => l.lang === 'uk')).toHaveLength(3)
  })

  it('returns [] when neither brand nor model is known', () => {
    expect(reviewLinks(null, null)).toEqual([])
    expect(reviewLinks('', '  ')).toEqual([])
  })
})
