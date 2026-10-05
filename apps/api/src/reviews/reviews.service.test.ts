import { describe, expect, it } from 'vitest'
import { carVideos, ownerPosts, topgearReviews } from '@carplates/db'
import type { CarVideoRow, InfocarVersionRow, OwnerPostRow, TopgearReviewRow } from '@carplates/db'

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
function serviceWith(
  rows: InfocarVersionRow[],
  videos: CarVideoRow[] = [],
  posts: OwnerPostRow[] = [],
  topgearRows: TopgearReviewRow[] = []
): ReviewsService {
  const rowsFor = (table: unknown): unknown[] =>
    table === carVideos ? videos : table === ownerPosts ? posts : table === topgearReviews ? topgearRows : rows
  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => Promise.resolve(rowsFor(table))
      })
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

const post: OwnerPostRow = {
  postId: 80077,
  url: 'https://e-drive.com.ua/post/80077',
  title: 'Shell oil at 300 000 km',
  category: 'Consumables',
  coverUrl: null,
  createdAt: '2025-07-01',
  brandSlug: 'kia',
  modelSlug: 'ceed',
  modelName: "Cee'd",
  generationName: 'II',
  yearFrom: 2012,
  yearTo: 2014,
  fetchedAt: new Date(0)
}

const topgear: TopgearReviewRow = {
  url: 'https://www.topgear.com/car-reviews/kia/ceed',
  makeSlug: 'kia',
  modelSlug: 'ceed',
  brandSlug: 'kia',
  title: 'Kia Ceed',
  rating: 6,
  bestRating: 10,
  publishedAt: '2015-01-13',
  yearFrom: null,
  yearTo: null,
  blurb: 'A good egg all round',
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
      videos: [],
      ownerPosts: [],
      topgear: []
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

  it('returns owner posts of the generation covering the car year, without DB-only fields', async () => {
    const service = serviceWith([row({})], [], [post])
    const hit = await service.lookup({ brand: 'KIA', model: "CEE'D", year: 2013 })
    expect(hit.ownerPosts).toEqual([
      {
        postId: 80077,
        url: 'https://e-drive.com.ua/post/80077',
        title: 'Shell oil at 300 000 km',
        category: 'Consumables',
        coverUrl: null,
        createdAt: '2025-07-01'
      }
    ])
    expect((await service.lookup({ brand: 'KIA', model: "CEE'D", year: 2019 })).ownerPosts).toEqual([])
  })

  it('returns TopGear reviews for the car model, without DB-only fields', async () => {
    const service = serviceWith([row({})], [], [], [topgear])
    const res = await service.lookup({ brand: 'KIA', model: "CEE'D", year: 2015 })
    expect(res.topgear).toEqual([
      {
        url: 'https://www.topgear.com/car-reviews/kia/ceed',
        title: 'Kia Ceed',
        rating: 6,
        bestRating: 10,
        publishedAt: '2015-01-13',
        blurb: 'A good egg all round'
      }
    ])
  })
})
