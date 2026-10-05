import { describe, expect, it } from 'vitest'

import { MAX_TOPGEAR_REVIEWS, topgearLookup } from './topgearLookup.js'
import type { TopgearLookupRow } from './topgearLookup.js'

const review = (overrides: Partial<TopgearLookupRow>): TopgearLookupRow => ({
  url: 'https://www.topgear.com/car-reviews/kia/ceed',
  modelSlug: 'ceed',
  brandSlug: 'kia',
  title: 'Kia Ceed',
  rating: 6,
  bestRating: 10,
  publishedAt: '2015-01-13',
  yearFrom: null,
  yearTo: null,
  blurb: null,
  ...overrides
})

describe('topgearLookup', () => {
  it('matches the registry spelling and lists the model before its variants', () => {
    const rows = [
      review({ url: 'sw', modelSlug: 'ceed-sportswagon', publishedAt: '2020-01-01' }),
      review({ url: 'ceed', modelSlug: 'ceed', publishedAt: '2015-01-13' })
    ]
    expect(topgearLookup(rows, 'kia', "CEE'D", 2015).map(r => r.url)).toEqual(['ceed', 'sw'])
  })

  it('only matches a year-range slug when the car year is inside it', () => {
    const rows = [
      review({ url: 'old', modelSlug: 'sportage-2017-2021', yearFrom: 2017, yearTo: 2021 }),
      review({ url: 'new', modelSlug: 'sportage', publishedAt: '2022-01-01' })
    ]
    expect(topgearLookup(rows, 'kia', 'SPORTAGE', 2019).map(r => r.url)).toEqual(['old', 'new'])
    expect(topgearLookup(rows, 'kia', 'SPORTAGE', 2023).map(r => r.url)).toEqual(['new'])
    expect(topgearLookup(rows, 'kia', 'SPORTAGE', null).map(r => r.url)).toEqual(['new', 'old'])
  })

  it('treats a `-0` duplicate-slug generation as the model itself', () => {
    const rows = [review({ url: 'b', modelSlug: 'sorento-prime' }), review({ url: 'a', modelSlug: 'sorento-0' })]
    expect(topgearLookup(rows, 'kia', 'SORENTO', 2012).map(r => r.url)).toEqual(['a', 'b'])
  })

  it('ignores other brands and models, and an unknown brand or empty model', () => {
    const rows = [review({}), review({ url: 'x', brandSlug: 'skoda', modelSlug: 'ceed' })]
    expect(topgearLookup(rows, 'skoda', 'OCTAVIA', 2015)).toEqual([])
    expect(topgearLookup(rows, null, 'CEED', 2015)).toEqual([])
    expect(topgearLookup(rows, 'kia', '', 2015)).toEqual([])
  })

  it('caps the list', () => {
    const rows = Array.from({ length: 9 }, (_, i) => review({ url: `u${i}`, modelSlug: `ceed-v${i}` }))
    expect(topgearLookup(rows, 'kia', 'CEED', 2015)).toHaveLength(MAX_TOPGEAR_REVIEWS)
  })
})
