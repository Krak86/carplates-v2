import { describe, expect, it } from 'vitest'

import { alnum, mapDetail, mapPage, pickModelSlug } from './carapis-parse.js'

/** Shapes copied from live CarAPIS answers (2026-11-03), values made up. */
const row = (over: Record<string, unknown> = {}) => ({
  id: 'a9001844-4115-4b2c-9e5a-ac5b3cc18cc2',
  source_code: 'auto_ria_ua',
  trim: '1.6 GDI',
  year: 2023,
  price_usd: 18500,
  price_original: '18500.00',
  price_original_currency: 'USD',
  mileage: 49000,
  fuel_type: 'gasoline',
  transmission: 'auto',
  body_type: 'hatchback',
  region: 'Kyiv',
  source_location: { iso2: 'UA', country_name: 'Ukraine' },
  has_accident: false,
  is_available: true,
  last_seen_at: '2026-11-02T15:34:05Z',
  thumb: { url: 'https://cdn.example/full.jpg', thumb_url: 'https://cdn.example/thumb.jpg' },
  ...over
})

describe('mapPage', () => {
  it('maps a row to our contract', () => {
    const [card] = mapPage({ count: 1, results: [row()] })
    expect(card).toMatchObject({
      id: 'a9001844-4115-4b2c-9e5a-ac5b3cc18cc2',
      sourceName: 'Auto.ria',
      country: 'UA',
      priceUsd: 18500,
      priceOriginal: 18500,
      currencyOriginal: 'USD',
      thumb: 'https://cdn.example/thumb.jpg'
    })
  })

  it('skips malformed rows and rows marked unavailable instead of failing the page', () => {
    const cards = mapPage({ results: [row(), { nope: 1 }, row({ id: 'b', is_available: false }), row({ id: 'c' })] })
    expect(cards.map(c => c.id)).toEqual(['a9001844-4115-4b2c-9e5a-ac5b3cc18cc2', 'c'])
  })

  it('drops a non-https thumbnail and tolerates a missing one', () => {
    expect(mapPage({ results: [row({ thumb: { thumb_url: 'http://insecure/x.jpg' } })] })[0]?.thumb).toBeNull()
    expect(mapPage({ results: [row({ thumb: null })] })[0]?.thumb).toBeNull()
  })

  it('returns nothing for a body that is not a page', () => {
    expect(mapPage('oops')).toEqual([])
    expect(mapPage({ detail: 'x' })).toEqual([])
  })
})

describe('mapDetail', () => {
  const body = {
    ...row(),
    description: 'A summary',
    engine_cc: 1599,
    owner_count: null,
    photos: [{ url: 'https://cdn.example/1.jpg' }, { url: 'ftp://nope' }, { thumb_url: 'https://cdn.example/2.jpg' }],
    listing_url: 'https://auto.ria.com/uk/auto_kia_ceed_1.html'
  }

  it('keeps the outbound link apart from the public detail', () => {
    const mapped = mapDetail(body)
    expect(mapped?.listingUrl).toBe('https://auto.ria.com/uk/auto_kia_ceed_1.html')
    expect(mapped?.detail).not.toHaveProperty('listingUrl')
    expect(mapped?.detail.photos).toEqual(['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'])
    expect(mapped?.detail.engineCc).toBe(1599)
  })

  it('refuses a listing link that is not https (it becomes a redirect target)', () => {
    expect(mapDetail({ ...body, listing_url: 'javascript:alert(1)' })?.listingUrl).toBeNull()
    expect(mapDetail({ ...body, listing_url: 'http://auto.ria.com/x' })?.listingUrl).toBeNull()
  })

  it('returns null for something that is not a vehicle', () => {
    expect(mapDetail({ detail: 'Not found.' })).toBeNull()
  })
})

describe('model slugs', () => {
  const models = [{ slug: 'andere-proceed' }, { slug: 'cd-ceed' }, { slug: 'ceed' }]

  it('compares by letters and digits only', () => {
    expect(alnum("Cee'd-GT")).toBe('ceedgt')
  })

  it('picks the slug that equals ours, never a near miss', () => {
    expect(pickModelSlug(models, 'ceed')).toBe('ceed')
    expect(pickModelSlug([{ slug: 'cd-ceed' }], 'cdceed')).toBe('cd-ceed')
    expect(pickModelSlug(models, 'proceed')).toBeNull()
    expect(pickModelSlug('x', 'ceed')).toBeNull()
  })
})
