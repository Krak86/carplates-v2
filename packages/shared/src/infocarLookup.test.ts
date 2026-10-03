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

  it('tries the first word when the full model text has no slug', () => {
    expect(infocarLookup(ROWS, 'KIA', 'CEED 1.6 CRDI', 2019, 2026).reviews!.level).toBe('version')
  })
})
