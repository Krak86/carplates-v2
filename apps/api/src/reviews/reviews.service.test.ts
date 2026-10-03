import { describe, expect, it } from 'vitest'
import { carVideos } from '@carplates/db'
import type { CarVideoRow, InfocarVersionRow } from '@carplates/db'

import type { DbService } from '../db/db.service.js'

import { ReviewsService } from './reviews.service.js'

function row(overrides: Partial<InfocarVersionRow>): InfocarVersionRow {
  return {
    id: 1,
    tree: 'reviews',
    brandSlug: 'kia',
    modelSlug: 'ceed',
    modelName: 'Ceed',
    versionName: 'Ceed',
    yearFrom: 2018,
    yearTo: 2021,
    url: 'https://kia-ceed.infocar.ua/review_ceed_id5550.html',
    reviewCount: 123,
    avgRating: 4.5,
    isRu: false,
    fetchedAt: new Date(0),
    ...overrides
  }
}

/** A DbService whose  resolves to that table's rows — the real filtering is the DB's job. */
function serviceWith(rows: InfocarVersionRow[], videos: CarVideoRow[] = []): ReviewsService {
  const db = {
    select: () => ({
      from: (table: unknown) => ({ where: () => Promise.resolve(table === carVideos ? videos : rows) })
    })
  }
  return new ReviewsService({ db } as unknown as DbService)
}

const video: CarVideoRow = {
  id: 1,
  youtubeId: 'o1aOohTtV4Y',
  infocarVideoId: 19231,
  url: 'https://www.infocar.ua/video/19231.html',
  title: 'Kia Ceed',
  thumbUrl: null,
  durationS: 63,
  publishedAt: '2026-07-08',
  brandSlug: 'kia',
  modelSlug: 'ceed',
  generationId: null,
  year: null,
  fetchedAt: new Date(0)
}

describe('ReviewsService.lookup', () => {
  it('returns the matching version per tree, ignoring rows of an unknown tree', async () => {
    const service = serviceWith([
      row({}),
      row({ tree: 'test_drive', url: 'https://kia-ceed.infocar.ua/test_ceed_id5550.html' }),
      row({ tree: 'bogus', url: 'https://x/bogus' })
    ])
    const res = await service.lookup({ brand: 'KIA', model: 'CEED', year: 2019 })
    expect(res.reviews).toMatchObject({ level: 'version', url: 'https://kia-ceed.infocar.ua/review_ceed_id5550.html' })
    expect(res.testDrive).toMatchObject({ level: 'version', url: 'https://kia-ceed.infocar.ua/test_ceed_id5550.html' })
  })

  it('falls back to the brand page for an unknown model', async () => {
    const res = await serviceWith([row({})]).lookup({ brand: 'KIA', model: 'NOPE', year: 2019 })
    expect(res.reviews).toMatchObject({ level: 'brand', url: 'https://www.infocar.ua/reviews/kia/' })
    expect(res.testDrive).toBeNull()
  })

  it('returns nothing for a brand without a known slug, without touching the DB', async () => {
    const service = new ReviewsService({} as unknown as DbService)
    expect(await service.lookup({ brand: 'МУССТАНГ', model: 'X', year: 2019 })).toEqual({
      testDrive: null,
      reviews: null,
      videos: []
    })
  })

  it('returns the videos tagged with the car model, without DB-only fields', async () => {
    const res = await serviceWith([row({})], [video]).lookup({ brand: 'KIA', model: 'CEED', year: 2019 })
    expect(res.videos).toEqual([
      {
        youtubeId: 'o1aOohTtV4Y',
        title: 'Kia Ceed',
        thumbUrl: null,
        durationS: 63,
        publishedAt: '2026-07-08',
        url: 'https://www.infocar.ua/video/19231.html'
      }
    ])
  })
})
