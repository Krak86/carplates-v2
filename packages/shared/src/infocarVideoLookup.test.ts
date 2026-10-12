import { describe, expect, it } from 'vitest'

import type { InfocarRow } from './infocarLookup.js'
import { titleGenerationSpan, videoLookup } from './infocarVideoLookup.js'
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

  it('maps a title year to its catalog generation, not a flat ±3 window', () => {
    const t = [video({ youtubeId: 't2016', year: 2016 }), video({ youtubeId: 't2021', year: 2021 })]
    // 2019 car: 2016 is inside 2015-2018 (not 2018-2022 ∋ 2019) -> dropped; 2021 is in 2018-2022 -> kept
    expect(ids(videoLookup(t, catalog, 'TOYOTA', 'RAV4', 2019))).toEqual(['t2021'])
    expect(ids(videoLookup(t, catalog, 'TOYOTA', 'RAV4', 2016))).toEqual(['t2016'])
  })

  it('ranks a year-less video by the generation on sale when it was published, without dropping others', () => {
    const t = [
      video({ youtubeId: 'pub2024', publishedAt: '2024-01-01' }),
      video({ youtubeId: 'pub2019', publishedAt: '2019-06-01' }),
      video({ youtubeId: 'pub2016', publishedAt: '2016-06-01' })
    ]
    // 2020 car (generation 2018-2022): the 2019 video first, the others kept after it, newest first
    expect(ids(videoLookup(t, catalog, 'TOYOTA', 'RAV4', 2020))).toEqual(['pub2019', 'pub2024', 'pub2016'])
  })
})

describe('generation words in titles', () => {
  const gens = [
    { code: 'Mk1', yearFrom: 2000, yearTo: 2005 },
    { code: 'Mk 2', yearFrom: 2006, yearTo: 2012 },
    { code: 'XV40', yearFrom: 2013, yearTo: null },
    { code: 'Third generation', yearFrom: 2020, yearTo: null }
  ]

  it('finds a single code as a standalone word, with optional space/hyphen', () => {
    expect(titleGenerationSpan('RAV4 MK1 review', gens, 2026)).toEqual({ from: 2000, to: 2005 })
    expect(titleGenerationSpan('Test mk-2 drive', gens, 2026)).toEqual({ from: 2006, to: 2012 })
    expect(titleGenerationSpan('XV40 review', gens, 2026)).toEqual({ from: 2013, to: 2026 })
  })

  it('ignores partial words, ambiguous titles and codes without a digit', () => {
    expect(titleGenerationSpan('AMK1 review', gens, 2026)).toBeNull()
    expect(titleGenerationSpan('MK1 vs MK2', gens, 2026)).toBeNull()
    expect(titleGenerationSpan('Third generation test', gens, 2026)).toBeNull()
  })

  it('drops a video whose generation word contradicts the car year', () => {
    const t = [video({ youtubeId: 'a', title: 'Mk1 test' }), video({ youtubeId: 'b', title: 'Mk2 test' })]
    expect(ids(videoLookup(t, [], 'TOYOTA', 'RAV4', 2008, 2026, gens))).toEqual(['b'])
  })
})
