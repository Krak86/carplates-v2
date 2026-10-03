import { describe, expect, it } from 'vitest'

import type { InfocarRow } from './infocarLookup.js'
import { videoLookup } from './infocarVideoLookup.js'
import type { InfocarVideoRow } from './infocarVideoLookup.js'

const video = (overrides: Partial<InfocarVideoRow>): InfocarVideoRow => ({
  youtubeId: 'abc',
  title: 't',
  thumbUrl: null,
  durationS: 60,
  publishedAt: '2026-01-01',
  brandSlug: 'toyota',
  modelSlug: 'rav4',
  generationId: null,
  year: null,
  url: 'https://www.infocar.ua/video/1.html',
  ...overrides
})

const version = (id: number, yearFrom: number, yearTo: number): InfocarRow => ({
  tree: 'test_drive',
  brandSlug: 'toyota',
  modelSlug: 'rav4',
  modelName: 'RAV4',
  versionName: 'RAV4',
  yearFrom,
  yearTo,
  url: `https://toyota-rav4.infocar.ua/test_rav4_id${id}.html`,
  reviewCount: null,
  avgRating: null
})

const catalog = [version(4612, 2015, 2018), version(5766, 2018, 2022), version(7347, 2026, 2026)]
const ids = (list: InfocarVideoRow[]): string[] => list.map(v => v.youtubeId)

describe('videoLookup', () => {
  const rows = [
    video({ youtubeId: 'new2026', generationId: 7347, publishedAt: '2026-07-11' }),
    video({ youtubeId: 'gen2015-a', generationId: 4612, publishedAt: '2016-05-01' }),
    video({ youtubeId: 'gen2015-b', generationId: 4612, publishedAt: '2017-05-01' }),
    video({ youtubeId: 'untagged', publishedAt: '2024-01-01' }),
    video({ youtubeId: 'title2026', year: 2026, publishedAt: '2026-02-01' }),
    video({ youtubeId: 'superb', brandSlug: 'skoda', modelSlug: 'superb-combi' }),
    video({ youtubeId: 'brandonly', modelSlug: null })
  ]

  it('limits videos to the generation covering the car year (2017 RAV4 gets no 2026 video)', () => {
    expect(ids(videoLookup(rows, catalog, 'TOYOTA', 'RAV4', 2017))).toEqual(['gen2015-b', 'gen2015-a', 'untagged'])
  })

  it('shows the new generation for a 2026 car, dropping old generations', () => {
    expect(ids(videoLookup(rows, catalog, 'TOYOTA', 'RAV4', 2026))).toEqual(['new2026', 'title2026', 'untagged'])
  })

  it('filters nothing without a car year', () => {
    expect(videoLookup(rows, catalog, 'TOYOTA', 'RAV4', null)).toHaveLength(5)
  })

  it('matches a variant slug (superb-combi for SUPERB)', () => {
    expect(ids(videoLookup(rows, catalog, 'SKODA', 'SUPERB', 2019))).toEqual(['superb'])
  })

  it('returns nothing for an unknown model, brand or empty model', () => {
    expect(videoLookup(rows, catalog, 'TOYOTA', 'YARIS', 2019)).toEqual([])
    expect(videoLookup(rows, catalog, 'МУССТАНГ', 'X', 2019)).toEqual([])
    expect(videoLookup(rows, catalog, 'TOYOTA', '', 2019)).toEqual([])
  })
})
