import { describe, it, expect } from 'vitest'

import { labelFromSlug, parseGalleryUrl, parsePageTitle, parseSitemap } from './carshow360-parse.js'

describe('parseGalleryUrl', () => {
  it('splits brand, model, slug and id', () => {
    expect(
      parseGalleryUrl(
        'https://carshow360.net/uk/kia/ceed/iii-fl2021-hatchback-buissnes-line-iii-11334?interior=&iframe'
      )
    ).toEqual({ brandSlug: 'kia', modelSlug: 'ceed', slug: 'iii-fl2021-hatchback-buissnes-line-iii', id: 11334 })
  })
  it('rejects make/model pages', () => {
    expect(parseGalleryUrl('https://carshow360.net/en/kia')).toBeNull()
    expect(parseGalleryUrl('https://carshow360.net/en/kia/ceed')).toBeNull()
  })
})

describe('parseSitemap', () => {
  it('collapses language variants onto one entry per id', () => {
    const xml = ['en', 'uk', 'de']
      .map(l => `<url><loc>https://carshow360.net/${l}/kia/ceed/iii-7955</loc></url>`)
      .join('')
    expect(parseSitemap(xml)).toEqual([{ brandSlug: 'kia', modelSlug: 'ceed', slug: 'iii', id: 7955 }])
  })
})

describe('labelFromSlug', () => {
  it('upper-cases roman numerals and FL years', () => {
    expect(labelFromSlug('iii-fl2021-hatchback-buissnes-line-iii')).toBe('III FL2021 Hatchback Buissnes Line III')
  })
})

describe('parsePageTitle', () => {
  it('strips the site suffix', () => {
    expect(parsePageTitle('<title>Kia Ceed III Hatchback | CarShow360</title>')).toBe('Kia Ceed III Hatchback')
    expect(parsePageTitle('<html></html>')).toBeNull()
  })
})
