import { describe, it, expect } from 'vitest'

import { buildFallback, fallbackSources, toFieldMap } from '@/components/vin/helpers'

describe('buildFallback', () => {
  const empty = toFieldMap([])

  it('fills gaps from the prefix and year code, labelled by source', () => {
    const f = buildFallback('KNAPC81ABHK000001', empty, undefined)
    expect(f.make).toEqual({ value: 'Kia', source: 'wmi' })
    expect(f.country).toEqual({ value: 'KR', source: 'wmi' })
    expect(f.year?.source).toBe('yearCode')
    expect(fallbackSources(f)).toEqual(['wmi', 'yearCode'])
  })

  it('prefers the registry record over the prefix table', () => {
    const f = buildFallback('KNAPC81ABHK000001', empty, { brand: 'KIA', model: 'SPORTAGE', makeYear: 2017 })
    expect(f.make).toEqual({ value: 'KIA', source: 'registry' })
    expect(f.model).toEqual({ value: 'SPORTAGE', source: 'registry' })
    expect(f.year).toEqual({ value: 2017, source: 'registry' })
  })

  it('never overrides what NHTSA decoded', () => {
    const fields = toFieldMap([
      { variable: 'Make', value: 'KIA' },
      { variable: 'Plant Country', value: 'SOUTH KOREA' },
      { variable: 'Model Year', value: '2017' }
    ])
    const f = buildFallback('KNAPC81ABHK000001', fields, { brand: 'X', model: null, makeYear: 2001 })
    expect(f).toEqual({})
  })
})
