import { describe, expect, it } from 'vitest'

import { lookupPrefix, regionRows } from '@/routes/read/plates/helpers'

describe('regionRows', () => {
  it('groups the letter pairs and legacy codes of one region', () => {
    const kyiv = regionRows().find(r => r.region === 'Київ')
    expect(kyiv?.pairs).toEqual(['АА', 'КА', 'ТТ', 'КК'])
    expect(kyiv?.legacy).toEqual(['11', '31'])
  })

  it('lists each region once, 4 pairs per statutory region', () => {
    const rows = regionRows()
    expect(new Set(rows.map(r => r.region)).size).toBe(rows.length)
    expect(rows.find(r => r.region === 'Київська область')?.pairs).toHaveLength(4)
  })
})

describe('lookupPrefix', () => {
  it('reads Latin and Cyrillic input alike', () => {
    expect(lookupPrefix('aa 1234 bb')).toMatchObject({ kind: 'region', region: 'Київ', legacy: false })
    expect(lookupPrefix('АА')).toMatchObject({ kind: 'region', region: 'Київ' })
  })

  it('reads a legacy region code', () => {
    expect(lookupPrefix('11АА1234')).toMatchObject({ kind: 'region', region: 'Київ', legacy: true })
  })

  it('tells the online-service series from a region', () => {
    expect(lookupPrefix('DІ7635ІА')).toMatchObject({ kind: 'service', series: 'diia' })
  })

  it('returns null until two characters are typed and unknown for a foreign prefix', () => {
    expect(lookupPrefix('A')).toBeNull()
    expect(lookupPrefix('ZZ1234')).toMatchObject({ kind: 'unknown' })
  })
})
