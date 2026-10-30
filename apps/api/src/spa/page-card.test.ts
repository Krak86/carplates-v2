import { describe, expect, it } from 'vitest'

import { buildPageCardSvg, pageCardHeadline, pageCardTitle, wrapLines } from './og-card.js'
import { catalogPageSlug, catalogSlugsOfCard, catalogSlugsOfPath, pageCardSlug, pagePathForSlug } from './page-card.js'
import { LANGS, STATIC_PAGES } from './spa-text.js'

describe('catalog page slugs', () => {
  it('round-trips a catalog card slug', () => {
    expect(catalogPageSlug('mercedes-benz', '3series')).toBe('cars--mercedes-benz--3series')
    expect(catalogSlugsOfCard('cars--mercedes-benz--3series')).toEqual({ make: 'mercedes-benz', model: '3series' })
    expect(catalogSlugsOfCard('cars--bmw')).toBeNull()
    expect(catalogSlugsOfCard('stats')).toBeNull()
    expect(catalogSlugsOfCard('cars--BMW--x5')).toBeNull()
  })

  it('reads make and model from a /cars path', () => {
    expect(catalogSlugsOfPath('/cars/bmw/x5')).toEqual({ make: 'bmw', model: 'x5' })
    expect(catalogSlugsOfPath('/cars/bmw/x5/')).toEqual({ make: 'bmw', model: 'x5' })
    expect(catalogSlugsOfPath('/cars/bmw')).toBeNull()
    expect(catalogSlugsOfPath('/cars/bmw/x5/2015')).toBeNull()
    expect(catalogSlugsOfPath('/cars/BMW/x5')).toBeNull()
    expect(catalogSlugsOfPath('/stats/bmw/x5')).toBeNull()
  })
})

describe('page card slugs', () => {
  it('maps static paths to slugs and back', () => {
    expect(pageCardSlug('/stats')).toBe('stats')
    expect(pageCardSlug('/read/vin')).toBe('read--vin')
    expect(pageCardSlug('/')).toBeNull()
    expect(pagePathForSlug('read--vin')).toBe('/read/vin')
  })

  it('rejects unknown slugs', () => {
    expect(pagePathForSlug('nope')).toBeNull()
    expect(pagePathForSlug('AA1234BB')).toBeNull()
  })

  it('round-trips every static page', () => {
    for (const path of Object.keys(STATIC_PAGES)) {
      const slug = pageCardSlug(path)
      if (slug) expect(pagePathForSlug(slug)).toBe(path)
    }
  })
})

describe('buildPageCardSvg', () => {
  it('drops the site suffix and prefix from the title', () => {
    expect(pageCardTitle('Статистика авто | Cars UA')).toBe('Статистика авто')
    expect(pageCardTitle('Cars UA - Privacy')).toBe('Privacy')
    expect(pageCardTitle('Wanted vehicles: statistics | Cars UA')).toBe('Wanted vehicles')
  })

  it('wraps long text into the line limit and escapes markup', () => {
    expect(wrapLines('one two three four five six', 9, 2)).toEqual(['one two', 'three fo…'])
    expect(buildPageCardSvg({ title: 'A<b>', description: 'x' })).toContain('A&lt;b&gt;')
  })

  it('keeps every page title within two lines', () => {
    for (const page of Object.values(STATIC_PAGES))
      for (const lang of LANGS) {
        const { lines } = pageCardHeadline(page[lang].title)
        expect(lines.length).toBeLessThanOrEqual(2)
        expect(lines.some(l => l.endsWith('…'))).toBe(false)
      }
  })
})
