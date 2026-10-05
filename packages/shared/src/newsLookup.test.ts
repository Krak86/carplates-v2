import { describe, it, expect } from 'vitest'

import { newsLookup, tagNews } from './newsLookup.js'
import type { NewsRow } from './newsLookup.js'

const BRANDS = ['toyota', 'kia', 'land-rover', 'mazda']
const MODELS: Record<string, string[]> = {
  toyota: ['camry', 'rav4', 'hilux'],
  kia: ['ceed', 'sportage'],
  'land-rover': ['defender'],
  mazda: ['mx-5', 'cx-5']
}
const modelsOf = (brand: string): string[] => MODELS[brand] ?? []

describe('tagNews', () => {
  it('finds brand, model and year in a headline', () => {
    expect(tagNews({ title: 'Toyota Camry 2024 отримала нову версію' }, BRANDS, modelsOf)).toEqual({
      brandSlug: 'toyota',
      modelSlug: 'camry',
      year: 2024
    })
  })

  it('matches a model spelled in several tokens', () => {
    expect(tagNews({ title: 'Новий Toyota RAV 4 вийшов' }, BRANDS, modelsOf).modelSlug).toBe('rav4')
    expect(tagNews({ title: 'Mazda MX-5 для ветеранів' }, BRANDS, modelsOf).modelSlug).toBe('mx-5')
  })

  it('leaves the model empty when only the brand is named, and the brand empty for general news', () => {
    expect(tagNews({ title: 'Kia розсекретила новинку' }, BRANDS, modelsOf)).toEqual({
      brandSlug: 'kia',
      modelSlug: null,
      year: null
    })
    expect(tagNews({ title: 'Ринок вживаних авто виріс' }, BRANDS, modelsOf).brandSlug).toBeNull()
  })

  it('falls back to the feed categories for the brand', () => {
    expect(tagNews({ title: 'Новий кросовер', categories: ['Kia'] }, BRANDS, modelsOf).brandSlug).toBe('kia')
  })
})

const row = (over: Partial<NewsRow> & { url: string }): NewsRow => ({
  source: 'infocar-news',
  title: 't',
  summary: null,
  imageUrl: null,
  publishedAt: '2026-10-01T00:00:00.000Z',
  lang: 'uk',
  brandSlug: 'toyota',
  modelSlug: null,
  year: null,
  ...over
})

describe('newsLookup', () => {
  const rows = [
    row({ url: 'brand-new', publishedAt: '2026-10-04T00:00:00Z' }),
    row({ url: 'camry-old', modelSlug: 'camry', publishedAt: '2026-09-01T00:00:00Z' }),
    row({ url: 'camry-2020', modelSlug: 'camry', year: 2020, publishedAt: '2026-08-01T00:00:00Z' }),
    row({ url: 'hilux', modelSlug: 'hilux', publishedAt: '2026-10-03T00:00:00Z' }),
    row({ url: 'kia', brandSlug: 'kia' })
  ]
  const catalog = ['camry', 'rav4', 'hilux']

  it('lists the model first (same model year before newer), then brand news; never another brand', () => {
    const urls = newsLookup(rows, 'toyota', 'CAMRY', 2020, catalog).map(r => [r.url, r.match])
    expect(urls).toEqual([
      ['camry-2020', 'model'],
      ['camry-old', 'model'],
      ['brand-new', 'brand'],
      ['hilux', 'brand']
    ])
  })

  it('falls back to brand only when the model has no news', () => {
    expect(newsLookup(rows, 'toyota', 'RAV4', 2020, catalog).every(r => r.match === 'brand')).toBe(true)
  })

  it('returns nothing without a brand or with no brand news', () => {
    expect(newsLookup(rows, null, 'CAMRY', 2020, catalog)).toEqual([])
    expect(newsLookup(rows, 'mazda', 'CX-5', 2020, catalog)).toEqual([])
  })
})
