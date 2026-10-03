import { describe, expect, it } from 'vitest'

import { reviewLinks } from './reviewLinks.js'

function urls(brand: string | null, model: string | null): Record<string, string> {
  return Object.fromEntries(reviewLinks(brand, model).map(l => [l.site, l.url]))
}

describe('reviewLinks', () => {
  it('builds each site’s own search URL', () => {
    expect(urls('SKODA', 'OCTAVIA')).toEqual({
      drive2: 'https://www.drive2.ru/search?text=SKODA%20OCTAVIA'
    })
  })

  it('collapses the registry double-space brand/model separator', () => {
    expect(urls('MERCEDES-BENZ  VITO', null).drive2).toBe('https://www.drive2.ru/search?text=MERCEDES-BENZ%20VITO')
  })

  it('appends the model year to the drive2 query when known', () => {
    const url = (year: number | null) => reviewLinks('KIA', "CEE'D", year)[0]?.url
    expect(url(2012)).toBe("https://www.drive2.ru/search?text=KIA%20CEE'D%202012")
    expect(url(null)).toBe("https://www.drive2.ru/search?text=KIA%20CEE'D")
  })

  it('tags drive2 as Russian', () => {
    expect(reviewLinks('TOYOTA', 'CAMRY').find(l => l.site === 'drive2')?.lang).toBe('ru')
  })

  it('returns [] when neither brand nor model is known', () => {
    expect(reviewLinks(null, null)).toEqual([])
    expect(reviewLinks('', '  ')).toEqual([])
  })
})
