import { describe, expect, it } from 'vitest'

import { findBrandSlug, MAX_PRESS_REVIEWS, pressLookup, pressTokens, titleYear } from './pressLookup.js'
import type { PressLookupRow } from './pressLookup.js'

const article = (title: string, overrides: Partial<PressLookupRow> = {}): PressLookupRow => ({
  url: `https://x/${title}`,
  source: 'itc',
  brandSlug: 'honda',
  keywords: '',
  yearHint: null,
  publishedAt: '2022-10-13',
  langs: { uk: { url: `https://x/${title}`, title, blurb: null } },
  ...overrides
})

describe('pressTokens', () => {
  it('splits letters from digits and drops diacritics and punctuation', () => {
    expect(pressTokens('Mazda6 CR-V e:HEV Škoda')).toEqual(['mazda', '6', 'cr', 'v', 'e', 'hev', 'skoda'])
  })
})

describe('findBrandSlug', () => {
  const brands = ['honda', 'land-rover', 'mercedes', 'volkswagen', 'kia']
  it('finds the earliest catalog brand, multi-word and aliased ones included', () => {
    expect(findBrandSlug(['Тест-драйв Honda CR-V'], brands)).toBe('honda')
    expect(findBrandSlug(['Тест-драйв Land Rover Defender'], brands)).toBe('land-rover')
    expect(findBrandSlug(['Mercedes-Benz GLA'], brands)).toBe('mercedes')
    expect(findBrandSlug(['VW ID.4 Crozz'], brands)).toBe('volkswagen')
  })
  it('tries the texts in order and returns null when nothing matches', () => {
    expect(findBrandSlug(['Тест-драйв кросовера', 'Kia Sportage'], brands)).toBe('kia')
    expect(findBrandSlug(['Тест-драйв кросовера'], brands)).toBeNull()
  })
})

describe('titleYear', () => {
  it('reads a plausible model year only', () => {
    expect(titleYear('X-Trail 2026')).toBe(2026)
    expect(titleYear('Duster 1.3 за 38 000, 1500 кг')).toBeNull()
  })
})

describe('pressLookup', () => {
  const slugs = ['crv', 'civic', 'hr-v']

  it("matches a model spelled with a hyphen in the title against the registry's squashed spelling", () => {
    const rows = [article('Тест-драйв Honda CR-V e:HEV AWD'), article('Тест-драйв Honda Civic')]
    expect(pressLookup(rows, 'honda', 'CR-V', 2022, slugs).map(r => r.url)).toEqual([rows[0]!.url])
  })

  it('matches via keywords when the title only names the model in another script', () => {
    const rows = [article('Тест-драйв кросовера', { keywords: 'Honda, HR-V' })]
    expect(pressLookup(rows, 'honda', 'HR-V', 2022, slugs)).toHaveLength(1)
  })

  it('needs the brand in front of a one-digit model so "6" is not any number', () => {
    const rows = [
      article('Тест-драйв Mazda6', { brandSlug: 'mazda' }),
      article('Mazda CX-5 з 6 подушками', { brandSlug: 'mazda' })
    ]
    expect(pressLookup(rows, 'mazda', '6', 2022, ['6', 'cx-5']).map(r => r.url)).toEqual([rows[0]!.url])
  })

  it('ranks by distance to the car year, drops articles over ten years away, caps the list', () => {
    const rows = [
      article('Honda Civic A', { publishedAt: '2005-01-01' }),
      article('Honda Civic B', { publishedAt: '2021-01-01' }),
      article('Honda Civic C', { yearHint: 2019 })
    ]
    expect(pressLookup(rows, 'honda', 'CIVIC', 2020, slugs).map(r => r.langs.uk?.title)).toEqual([
      'Honda Civic C',
      'Honda Civic B'
    ])
    const many = Array.from({ length: 10 }, (_, i) => article(`Honda Civic ${i}`))
    expect(pressLookup(many, 'honda', 'CIVIC', 2022, slugs)).toHaveLength(MAX_PRESS_REVIEWS)
  })

  it('returns nothing without a brand or model, or for another brand', () => {
    expect(pressLookup([article('Honda Civic')], null, 'CIVIC', 2022, slugs)).toEqual([])
    expect(pressLookup([article('Honda Civic')], 'honda', '', 2022, slugs)).toEqual([])
    expect(pressLookup([article('Honda Civic')], 'kia', 'CIVIC', 2022, slugs)).toEqual([])
  })
})
