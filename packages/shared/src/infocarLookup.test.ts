import { describe, it, expect } from 'vitest'

import { infocarLookup, type InfocarRow } from './infocarLookup.js'

const row = (o: Partial<InfocarRow>): InfocarRow => ({
  tree: 'reviews',
  brandSlug: 'kia',
  modelSlug: 'ceed',
  modelName: 'Ceed',
  versionName: 'Ceed',
  yearFrom: 2018,
  yearTo: 2021,
  url: 'https://x/ceed-3',
  reviewCount: 123,
  avgRating: 4.5,
  ...o
})

const ROWS: InfocarRow[] = [
  row({ versionName: null, yearFrom: null, yearTo: null, url: 'https://www.infocar.ua/reviews/kia/ceed/' }),
  row({}),
  row({ yearFrom: 2015, yearTo: 2018, url: 'https://x/ceed-2' }),
  row({ versionName: 'Ceed SW', yearFrom: 2018, yearTo: 2021, url: 'https://x/ceed-sw' }),
  row({ versionName: 'Ceed Next', yearFrom: 2022, yearTo: null, url: 'https://x/ceed-4' })
]

describe('infocarLookup', () => {
  it('picks the version whose range contains the year, plain one first', () => {
    const m = infocarLookup(ROWS, 'KIA', 'CEED', 2019, 2026).reviews!
    expect(m.level).toBe('version')
    expect(m.url).toBe('https://x/ceed-3')
    expect(m.versions.map(v => v.url)).toEqual(['https://x/ceed-3', 'https://x/ceed-sw'])
    expect(m.reviewCount).toBe(123)
  })

  it('prefers the version named like the registry model', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED SW', 2019, 2026).reviews!.url).toBe('https://x/ceed-sw')
  })

  it('returns all versions at overlapping range edges', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED', 2018, 2026).reviews!.versions).toHaveLength(3)
  })

  it('treats a null year_to as still in production', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED', 2025, 2026).reviews!.url).toBe('https://x/ceed-4')
  })

  it('falls back to the model page when no version covers the year', () => {
    const m = infocarLookup(ROWS, 'KIA', 'CEED', 1999, 2026).reviews!
    expect(m.level).toBe('model')
    expect(m.url).toBe('https://www.infocar.ua/reviews/kia/ceed/')
  })

  it('falls back to the brand page for an unknown model, and to null for an unknown brand or tree', () => {
    const m = infocarLookup(ROWS, 'KIA', 'NOPE', 2019, 2026).reviews!
    expect(m).toMatchObject({ level: 'brand', url: 'https://www.infocar.ua/reviews/kia/' })
    expect(infocarLookup(ROWS, 'KIA', 'CEED', 2019, 2026).test_drive).toBeNull()
    expect(infocarLookup(ROWS, 'UNKNOWNBRAND', 'X', 2019, 2026).reviews).toBeNull()
  })

  it('builds a year-filtered model page for owner reviews only, capped at the current year', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED', 2012, 2026).reviews!.yearUrl).toBe(
      'https://www.infocar.ua/reviews/kia/ceed/?y1=2012&y2=2013&sort=0'
    )
    expect(infocarLookup(ROWS, 'KIA', 'CEED', 2026, 2026).reviews!.yearUrl).toContain('y2=2026')
    expect(infocarLookup(ROWS, 'KIA', 'CEED', null, 2026).reviews!.yearUrl).toBeNull()
    const drives = ROWS.map(r => ({ ...r, tree: 'test_drive' as const }))
    expect(infocarLookup(drives, 'KIA', 'CEED', 2012, 2026).test_drive!.yearUrl).toBeNull()
  })

  it("matches a punctuated registry model (CEE'D -> ceed) and lists versions overlapping year..year+1", () => {
    const m = infocarLookup(ROWS, 'KIA', "CEE'D", 2017, 2026).reviews!
    expect(m.level).toBe('version')
    // 2015–2018 covers 2017; the 2018–2021 versions start inside the window (2017–2018) and follow it.
    expect(m.versions.map(v => v.url)).toEqual(['https://x/ceed-2', 'https://x/ceed-3', 'https://x/ceed-sw'])
    expect(m.yearUrl).toBe('https://www.infocar.ua/reviews/kia/ceed/?y1=2017&y2=2018&sort=0')
  })

  describe('registry models that differ from infocar slugs', () => {
    const rows = (brand: string, slugs: string[]): InfocarRow[] =>
      slugs.map(slug =>
        row({ brandSlug: brand, modelSlug: slug, modelName: slug, versionName: null, url: `u/${slug}` })
      )
    const level = (brand: string, slugs: string[], registryBrand: string, model: string) =>
      infocarLookup(rows(brand, slugs), registryBrand, model, 2013, 2026).reviews

    it('maps BMW trims to the series and Mercedes trims to the class', () => {
      expect(level('bmw', ['3-series', 'x3'], 'BMW', '328I')?.url).toBe('u/3-series')
      expect(level('mercedes', ['e-class', 'm-class'], 'MERCEDES-BENZ', 'E 200')?.url).toBe('u/e-class')
      expect(level('mercedes', ['e-class', 'm-class'], 'MERCEDES-BENZ', 'ML 350')?.url).toBe('u/m-class')
    })

    it('matches a leading run of words, a lone distinctive word, and shortened factory codes', () => {
      const toyota = ['land-cruiser', 'land-cruiser-prado']
      expect(level('toyota', toyota, 'TOYOTA', 'LAND CRUISER PRADO 150')?.url).toBe('u/land-cruiser-prado')
      expect(level('toyota', toyota, 'TOYOTA', 'LAND CRUISER 200')?.url).toBe('u/land-cruiser')
      expect(level('toyota', toyota, 'TOYOTA', 'PRADO')?.url).toBe('u/land-cruiser-prado')
      expect(level('vaz', ['2106', '2107'], 'ВАЗ', '21063')?.url).toBe('u/2106')
    })
  })

  it('tries the first word when the full model text has no slug', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED 1.6 CRDI', 2019, 2026).reviews!.level).toBe('version')
  })
})
