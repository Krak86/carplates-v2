import { describe, expect, it } from 'vitest'

import { parseShowroomFilter, showroomHas, showroomMatches, showroomTitleize } from './showroom.js'
import type { ShowroomItem } from './showroom.js'

const item = (over: Partial<ShowroomItem> = {}): ShowroomItem => ({
  brandSlug: 'bmw',
  modelSlug: '3-series',
  label: 'BMW 3 Series',
  n360: 0,
  n3d: 0,
  nTuning: 0,
  thumbUrl: null,
  ...over
})

describe('parseShowroomFilter', () => {
  it('keeps a known filter and falls back to all', () => {
    expect(parseShowroomFilter('3d')).toBe('3d')
    expect(parseShowroomFilter('tuning')).toBe('tuning')
    expect(parseShowroomFilter('ar')).toBe('all')
    expect(parseShowroomFilter(null)).toBe('all')
  })
})

describe('showroomHas', () => {
  it('checks the asked kind, and any kind for all', () => {
    const only360 = item({ n360: 2 })
    expect(showroomHas(only360, '360')).toBe(true)
    expect(showroomHas(only360, '3d')).toBe(false)
    expect(showroomHas(only360, 'all')).toBe(true)
    expect(showroomHas(item(), 'all')).toBe(false)
  })
})

describe('showroomMatches', () => {
  it('needs every word, ignoring case and punctuation', () => {
    expect(showroomMatches(item(), 'bmw 3')).toBe(true)
    expect(showroomMatches(item(), 'BMW 3-Series')).toBe(true)
    expect(showroomMatches(item(), 'bmw golf')).toBe(false)
    expect(showroomMatches(item(), '   ')).toBe(true)
  })

  it('matches the slugs too', () => {
    expect(showroomMatches(item({ label: 'Serie 3' }), 'bmw')).toBe(true)
  })
})

describe('showroomTitleize', () => {
  it('turns a slug into a name', () => {
    expect(showroomTitleize('mercedes-benz')).toBe('Mercedes Benz')
    expect(showroomTitleize('x5')).toBe('X5')
    expect(showroomTitleize('gt')).toBe('GT')
    expect(showroomTitleize('golf.7')).toBe('Golf 7')
  })
})
