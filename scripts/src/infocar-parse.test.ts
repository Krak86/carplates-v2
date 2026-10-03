import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  absoluteUrl,
  decodeInfocarHtml,
  parseBrands,
  parseModelStats,
  parseModels,
  parseVersions,
  parseYearRange
} from './infocar-parse.js'

const page = (name: string): string =>
  decodeInfocarHtml(readFileSync(join(import.meta.dirname, 'fixtures', 'infocar', `${name}.html`)))

describe('decodeInfocarHtml', () => {
  it('decodes windows-1251 pages', () => {
    expect(page('test-drive-kia')).toContain('Оберіть модель KIA')
  })
})

describe('absoluteUrl', () => {
  it('normalises protocol-relative and root-relative URLs', () => {
    expect(absoluteUrl('//kia-ceed.infocar.ua/x.html')).toBe('https://kia-ceed.infocar.ua/x.html')
    expect(absoluteUrl('/reviews/kia/')).toBe('https://www.infocar.ua/reviews/kia/')
  })
})

describe('parseYearRange', () => {
  it('parses closed, open-ended and missing ranges', () => {
    expect(parseYearRange('2018 - 2021')).toEqual({ yearFrom: 2018, yearTo: 2021 })
    expect(parseYearRange('2022 - н.в.')).toEqual({ yearFrom: 2022, yearTo: null })
    expect(parseYearRange('2022')).toEqual({ yearFrom: 2022, yearTo: null })
    expect(parseYearRange('')).toEqual({ yearFrom: null, yearTo: null })
  })
})

describe('parseBrands (reviews/marks.html)', () => {
  const brands = parseBrands(page('reviews-marks'))

  it('reads slug, name and review count', () => {
    expect(brands.length).toBeGreaterThan(100)
    expect(brands[0]).toEqual({ slug: 'acura', name: 'Acura', reviewCount: 37, isRu: false })
    expect(brands.find(b => b.slug === 'kia')?.reviewCount).toBe(858)
  })

  it('tags the Russian/Soviet run that restarts the alphabet', () => {
    expect(brands.find(b => b.slug === 'vaz')?.isRu).toBe(true)
    expect(brands.find(b => b.slug === 'zaz')?.isRu).toBe(true)
    expect(brands.find(b => b.slug === 'zeekr')?.isRu).toBe(false)
    expect(brands.find(b => b.slug === 'volkswagen')?.isRu).toBe(false)
  })
})

describe('parseModels', () => {
  it('reads the reviews tree with counts', () => {
    const models = parseModels(page('reviews-kia'), 'reviews', 'kia')
    expect(models.find(m => m.slug === 'ceed')).toMatchObject({ name: 'Ceed', reviewCount: 123 })
    expect(models.find(m => m.slug === 'avella')?.reviewCount).toBe(1)
  })

  it('reads the test-drive tree without counts', () => {
    const models = parseModels(page('test-drive-kia'), 'test_drive', 'kia')
    expect(models).toHaveLength(31)
    expect(models.find(m => m.slug === 'ceed')).toEqual({ slug: 'ceed', name: 'Ceed', reviewCount: null })
  })
})

describe('parseVersions', () => {
  it('reads the reviews tree version cards', () => {
    const v = parseVersions(page('reviews-kia-ceed'))
    expect(v[0]).toEqual({
      name: 'Ceed',
      yearFrom: 2018,
      yearTo: 2021,
      url: 'https://kia-ceed.infocar.ua/review_ceed_id5550.html'
    })
    expect(v.map(x => x.name)).toContain('ProCeed')
    expect(new Set(v.map(x => x.url)).size).toBe(v.length)
  })

  it('reads the test-drive tree version cards (17 for Ceed)', () => {
    const v = parseVersions(page('test-drive-kia-ceed'))
    expect(v).toHaveLength(17)
    expect(v[0]).toMatchObject({ name: 'Ceed', yearFrom: 2021, yearTo: 2025 })
    expect(v[0]!.url).toBe('https://kia-ceed.infocar.ua/test_ceed_id6760.html')
  })

  it('is empty for a page without a version carousel', () => {
    expect(parseVersions(page('test-drive-kia'))).toEqual([])
  })
})

describe('parseModelStats', () => {
  it('reads average and count from a reviews model page', () => {
    expect(parseModelStats(page('reviews-kia-ceed'))).toEqual({ reviewCount: 123, avgRating: 4.5 })
  })

  it('is null without a rating block', () => {
    expect(parseModelStats(page('test-drive-kia-ceed'))).toBeNull()
  })
})
