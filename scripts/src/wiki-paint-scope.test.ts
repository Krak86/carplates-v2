import { describe, expect, it } from 'vitest'

import { normalizeScope } from './wiki-paint-scope.js'

describe('normalizeScope', () => {
  it('lower-cases, trims, drops empties and duplicates', () => {
    expect(normalizeScope([' Touareg ', 'touareg', '', 'PASSAT'])).toEqual(['touareg', 'passat'])
  })

  it('keeps an empty list empty', () => {
    expect(normalizeScope([])).toEqual([])
  })
})
