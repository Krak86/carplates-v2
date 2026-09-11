import { describe, expect, it } from 'vitest'

import { toRegistrationDto } from './plate.dto.js'

describe('toRegistrationDto', () => {
  it('keeps the 20 registration fields and drops row internals', () => {
    const row = {
      id: 42,
      sourceResourceId: 'ckan-2026',
      plate: 'ВЕ7116АА',
      person: 'P',
      regAddrKoatuu: '4823355100',
      operCode: 100,
      operName: 'ПЕРВИННА РЕЄСТРАЦIЯ',
      dReg: '2018-05-11',
      depCode: '1234',
      dep: 'ТСЦ 1234',
      brand: 'TOYOTA',
      model: 'CAMRY',
      vin: '4T1BF1FK5CU000001',
      makeYear: 2018,
      color: 'ЧОРНИЙ',
      kind: 'ЛЕГКОВИЙ',
      body: 'СЕДАН',
      purpose: 'ЗАГАЛЬНИЙ',
      fuel: 'БЕНЗИН',
      capacity: 2494,
      powerKwt: null,
      ownWeight: 1490,
      totalWeight: 1990,
      plateInferred: false
    }

    const dto = toRegistrationDto(row)

    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('sourceResourceId')
    expect(dto.plate).toBe('ВЕ7116АА')
    expect(dto.makeYear).toBe(2018)
    expect(Object.keys(dto)).toHaveLength(22)
  })

  it('passes nulls through, including a plateless (2026) row', () => {
    const dto = toRegistrationDto({
      plate: null,
      person: null,
      regAddrKoatuu: null,
      operCode: null,
      operName: null,
      dReg: null,
      depCode: null,
      dep: null,
      brand: null,
      model: null,
      vin: 'WBAKV210300R24692',
      makeYear: null,
      color: null,
      kind: null,
      body: null,
      purpose: null,
      fuel: null,
      capacity: null,
      powerKwt: 120,
      ownWeight: null,
      totalWeight: null,
      plateInferred: true
    })
    expect(dto.vin).toBe('WBAKV210300R24692')
    expect(dto.plate).toBeNull()
    expect(dto.powerKwt).toBe(120)
    expect(dto.plateInferred).toBe(true)
  })
})
