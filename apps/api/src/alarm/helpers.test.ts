import { describe, expect, it } from 'vitest'

import { isFresh } from './helpers.js'

describe('isFresh', () => {
  it('is false before the first poll and after the limit', () => {
    expect(isFresh(null, 1_000)).toBe(false)
    expect(isFresh(0, 3 * 60_000 + 1)).toBe(false)
  })

  it('is true within the limit', () => {
    expect(isFresh(0, 60_000)).toBe(true)
  })
})
