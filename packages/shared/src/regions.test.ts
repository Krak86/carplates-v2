import { describe, expect, it } from 'vitest'

import { normalizePlate } from './plate.js'
import { REGIONS, regionName } from './regions.js'

describe('regionName', () => {
  it('resolves a plate prefix to its region', () => {
    expect(regionName('ВЕ7116АА')).toBe('Миколаївська область')
    expect(regionName('АА1234ВС')).toBe('Київ')
    expect(regionName('КХ0001КХ')).toBe('Харківська область')
  })

  it('works with a freshly normalized Latin plate', () => {
    expect(regionName(normalizePlate('be7116aa'))).toBe('Миколаївська область')
  })

  it('returns undefined for an unknown prefix', () => {
    expect(regionName('ZZ0000ZZ')).toBeUndefined()
    expect(regionName('')).toBeUndefined()
  })
})

describe('REGIONS', () => {
  it('has the full v1 prefix table', () => {
    expect(Object.keys(REGIONS)).toHaveLength(54)
  })
})
