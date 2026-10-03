import type { InfocarMatch } from '@carplates/shared'
import { describe, expect, it } from 'vitest'

import { formatYears, infocarLinks } from '@/components/ReviewLinks.helpers'

const base: InfocarMatch = {
  level: 'version',
  url: 'https://x/a',
  modelName: 'Ceed',
  versions: [
    { name: 'Ceed', yearFrom: 2018, yearTo: 2021, url: 'https://x/a' },
    { name: 'Ceed SW', yearFrom: 2018, yearTo: 2021, url: 'https://x/b' }
  ],
  reviewCount: 123,
  avgRating: 4.5,
  yearUrl: null
}

describe('formatYears', () => {
  it('formats ranges, single years and unknowns', () => {
    expect(formatYears(2018, 2021)).toBe('2018–2021')
    expect(formatYears(2020, 2020)).toBe('2020')
    expect(formatYears(2022, null)).toBe('2022')
    expect(formatYears(null, null)).toBe('')
  })
})

describe('infocarLinks', () => {
  it('lists every matching version with its years, best first', () => {
    expect(infocarLinks(base)).toEqual([
      { title: 'Ceed 2018–2021', level: 'version', url: 'https://x/a' },
      { title: 'Ceed SW 2018–2021', level: 'version', url: 'https://x/b' }
    ])
  })

  it('gives a single untitled link for a model or brand level match', () => {
    expect(infocarLinks({ ...base, level: 'model', versions: [], url: 'https://x/m' })).toEqual([
      { title: null, level: 'model', url: 'https://x/m' }
    ])
  })
})
