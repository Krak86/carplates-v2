import { describe, expect, it } from 'vitest'

import { MAX_OWNER_POSTS, edriveModelSlug, ownerPostLookup } from './edriveLookup.js'
import type { OwnerPostLookupRow } from './edriveLookup.js'

const post = (overrides: Partial<OwnerPostLookupRow>): OwnerPostLookupRow => ({
  postId: 1,
  url: 'https://e-drive.com.ua/post/1',
  title: 't',
  category: null,
  coverUrl: null,
  createdAt: '2024-01-01',
  brandSlug: 'kia',
  modelSlug: 'ceed',
  yearFrom: 2012,
  yearTo: 2017,
  ...overrides
})

describe('edriveModelSlug', () => {
  it('drops apostrophes and slugifies', () => {
    expect(edriveModelSlug("Cee'd")).toBe('ceed')
    expect(edriveModelSlug('Grand Cherokee')).toBe('grand-cherokee')
  })
})

describe('ownerPostLookup', () => {
  it('matches the registry spelling and only the generation covering the car year', () => {
    const rows = [post({ postId: 1 }), post({ postId: 2, yearFrom: 2018, yearTo: null })]
    expect(ownerPostLookup(rows, 'kia', "CEE'D", 2015).map(r => r.postId)).toEqual([1])
    expect(ownerPostLookup(rows, 'kia', "CEE'D", 2020).map(r => r.postId)).toEqual([2])
  })

  it('does not filter by year without one, and sorts newest first', () => {
    const rows = [post({ postId: 1, createdAt: '2023-01-01' }), post({ postId: 2, createdAt: '2025-01-01' })]
    expect(ownerPostLookup(rows, 'kia', 'CEED', null).map(r => r.postId)).toEqual([2, 1])
  })

  it('accepts a model variant, ignores other brands/models, caps the list', () => {
    const rows = [
      post({ postId: 1, modelSlug: 'passat-variant', brandSlug: 'volkswagen' }),
      post({ postId: 2, modelSlug: 'golf', brandSlug: 'volkswagen' }),
      ...Array.from({ length: MAX_OWNER_POSTS + 10 }, (_, i) => post({ postId: 100 + i, modelSlug: 'rio' }))
    ]
    expect(ownerPostLookup(rows, 'volkswagen', 'PASSAT', 2015).map(r => r.postId)).toEqual([1])
    expect(ownerPostLookup(rows, 'kia', 'RIO', 2015)).toHaveLength(MAX_OWNER_POSTS)
    expect(ownerPostLookup(rows, 'kia', 'NOPE', 2015)).toEqual([])
    expect(ownerPostLookup(rows, null, 'RIO', 2015)).toEqual([])
  })
})
