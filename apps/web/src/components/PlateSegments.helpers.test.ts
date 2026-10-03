import { describe, it, expect } from 'vitest'

import { splitPlate } from '@/components/PlateSegments.helpers'

describe('splitPlate', () => {
  it('splits a current plate into region · number · series', () => {
    expect(splitPlate('ВЕ7116АА')?.map(s => [s.id, s.text])).toEqual([
      ['region', 'ВЕ'],
      ['number', '7116'],
      ['series', 'АА']
    ])
  })

  it('accepts Latin input and flags the online-service series', () => {
    expect(splitPlate('DI7635IA')?.[0]).toMatchObject({ id: 'service', text: 'DІ' })
  })

  it('splits a legacy plate with the region digits first', () => {
    expect(splitPlate('11АА1234')?.map(s => [s.id, s.text])).toEqual([
      ['region', '11'],
      ['series', 'АА'],
      ['number', '1234']
    ])
  })

  it('returns null for other shapes', () => {
    expect(splitPlate('12345')).toBeNull()
  })
})
