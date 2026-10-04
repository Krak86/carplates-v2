import { describe, it, expect } from 'vitest'

import { textFilterError } from './searchFilters.js'

describe('textFilterError', () => {
  it('allows empty and indexable pairs', () => {
    expect(textFilterError('', '')).toBeNull()
    expect(textFilterError('audi', '')).toBeNull()
    expect(textFilterError('', 'golf')).toBeNull()
  })

  it('allows a short model when the make is indexable', () => {
    expect(textFilterError('audi', 'a6')).toBeNull()
    expect(textFilterError('mazda', '3')).toBeNull()
  })

  it('allows a 2-char make with an indexable model', () => {
    expect(textFilterError('mg', 'zs ev')).toBeNull()
  })

  it('rejects a 1-char make', () => {
    expect(textFilterError('a', 'golf')).toBe('brandTooShort')
  })

  it('rejects when neither field is indexable', () => {
    expect(textFilterError('', 'a6')).toBe('needsIndexable')
    expect(textFilterError('mg', 'zs')).toBe('needsIndexable')
  })
})
