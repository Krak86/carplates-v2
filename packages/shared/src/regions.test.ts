import { describe, expect, it } from 'vitest'

import { normalizePlate } from './plate.js'
import { LEGACY_REGIONS, platePrefixesForRegion, plateSeries, REGION_NAMES, REGIONS, regionName } from './regions.js'

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

describe('legacy region codes', () => {
  it('resolves digits-first plates', () => {
    expect(regionName('11АА0002')).toBe('Київ')
    expect(regionName('26FТ9098')).toBe('Чернівецька область')
  })

  it('leaves unmapped codes and other shapes alone', () => {
    expect(regionName('34DЕ0910')).toBeUndefined()
    expect(regionName('011234')).toBeUndefined()
  })

  it('adds the numeric codes to a region search filter', () => {
    expect(platePrefixesForRegion('Київ')).toEqual(['АА', 'КА', 'ТТ', 'КК', '11', '31'])
    expect(Object.keys(LEGACY_REGIONS)).toHaveLength(28)
  })
})

describe('plateSeries', () => {
  it("detects the Diia and Driver's Cabinet series", () => {
    expect(plateSeries(normalizePlate('DІ7635ІА'))).toBe('diia')
    expect(plateSeries('ЕD0006YА')).toBe('driverCabinet')
    expect(plateSeries('ВЕ7116АА')).toBeUndefined()
  })

  it('has no region', () => {
    expect(regionName('DІ7635ІА')).toBeUndefined()
  })
})

describe('REGIONS', () => {
  it('has all 108 statutory letter pairs (27 regions × 4)', () => {
    expect(Object.keys(REGIONS)).toHaveLength(108)
    expect(REGION_NAMES).toHaveLength(27)
  })
})
