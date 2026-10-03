import { describe, expect, it } from 'vitest'

import { reviewLinks } from './reviewLinks.js'

function urls(brand: string | null, model: string | null): Record<string, string> {
  return Object.fromEntries(reviewLinks(brand, model).map(l => [l.site, l.url]))
}

describe('reviewLinks', () => {
  it('builds each site’s own search URL', () => {
    expect(urls('SKODA', 'OCTAVIA')).toEqual({
      'auto-blog': 'https://auto-blog.com.ua/uk/?s=SKODA%20OCTAVIA',
      drive2: 'https://www.drive2.ru/search?text=SKODA%20OCTAVIA'
    })
  })

  it('collapses the registry double-space brand/model separator', () => {
    expect(urls('MERCEDES-BENZ  VITO', null).drive2).toBe('https://www.drive2.ru/search?text=MERCEDES-BENZ%20VITO')
  })

  it('tags drive2 as Russian and auto-blog as Ukrainian', () => {
    const links = reviewLinks('TOYOTA', 'CAMRY')
    expect(links.find(l => l.site === 'drive2')?.lang).toBe('ru')
    expect(links.find(l => l.site === 'auto-blog')?.lang).toBe('uk')
  })

  it('returns [] when neither brand nor model is known', () => {
    expect(reviewLinks(null, null)).toEqual([])
    expect(reviewLinks('', '  ')).toEqual([])
  })
})
