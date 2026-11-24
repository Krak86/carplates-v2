import { describe, expect, it } from 'vitest'

import { syncRequestSchema, syncResponseSchema } from './account.js'

describe('sync contract: saved comparisons', () => {
  it('defaults `comparisons` to [] for clients that predate comparison sync', () => {
    expect(syncRequestSchema.parse({ favorites: [], history: [] }).comparisons).toEqual([])
    expect(syncResponseSchema.parse({ favorites: [], history: [], evictedFavorites: 0 }).comparisons).toEqual([])
  })

  it('accepts live comparisons and tombstones', () => {
    const live = { id: 'a|b', a: 'a', b: 'b', labelA: 'A', labelB: 'B', date: 1 }
    const parsed = syncRequestSchema.parse({
      favorites: [],
      history: [],
      comparisons: [live, { ...live, id: 'c|d', deleted: true }]
    })
    expect(parsed.comparisons).toHaveLength(2)
  })

  it('rejects a comparison without a positive date', () => {
    const bad = { id: 'a|b', a: 'a', b: 'b', labelA: 'A', labelB: 'B', date: 0 }
    expect(syncRequestSchema.safeParse({ favorites: [], history: [], comparisons: [bad] }).success).toBe(false)
  })
})
