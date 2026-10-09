import { describe, it, expect } from 'vitest'

import { decodeEntities } from '@/lib/bluesky'

describe('decodeEntities', () => {
  it('decodes numeric, hex and named entities', () => {
    expect(decodeEntities('Cee&#039;d &amp; Ceed &#x27;x&#x27; &quot;y&quot;')).toBe("Cee'd & Ceed 'x' \"y\"")
  })

  it('leaves unknown or invalid entities and plain text alone', () => {
    expect(decodeEntities('a &foo; b &#0; c')).toBe('a &foo; b &#0; c')
  })
})
