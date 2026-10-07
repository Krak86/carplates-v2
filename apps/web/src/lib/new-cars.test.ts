import { describe, expect, it } from 'vitest'

import { pickDistinctAds } from '@/lib/new-cars'

describe('pickDistinctAds', () => {
  it('never repeats a line within one draw', () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickDistinctAds(3, 6)
      expect(new Set(picked).size).toBe(3)
      expect(picked.every(n => n >= 1 && n <= 6)).toBe(true)
    }
  })

  it('returns fewer when the pool is smaller than asked', () => {
    expect(pickDistinctAds(5, 2)).toHaveLength(2)
  })
})
