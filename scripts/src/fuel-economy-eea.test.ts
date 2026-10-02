import { describe, expect, it } from 'vitest'

import {
  buildGroupQuery,
  collapseEeaGroups,
  eeaFuelCategory,
  eeaPowertrain,
  normalizeEeaModel
} from './fuel-economy-eea.js'
import type { EeaGroup } from './fuel-economy-eea.js'

function group(o: Partial<EeaGroup>): EeaGroup {
  return {
    Mk: 'TOYOTA',
    Cn: 'COROLLA',
    Ft: 'petrol',
    Fm: 'M',
    ec: 1798,
    cyc: 'WLTP',
    regs: 1,
    co2: 120,
    fc: 5.3,
    z: null,
    ...o
  }
}

describe('normalizeEeaModel', () => {
  it('drops the variant tail after a double space', () => {
    expect(normalizeEeaModel('COROLLA   1.8   HIBRID CVT', 'TOYOTA')).toBe('COROLLA')
  })

  it('drops a make prefix and the parenthesised generation', () => {
    expect(normalizeEeaModel('TOYOTA LAND CRUISER (150 SERIES)', 'TOYOTA')).toBe('LAND CRUISER')
  })
})

describe('eeaPowertrain / eeaFuelCategory', () => {
  it('maps fuel mode to powertrain', () => {
    expect(eeaPowertrain('petrol', 'M')).toBe('ice')
    expect(eeaPowertrain('petrol', 'H')).toBe('hybrid')
    expect(eeaPowertrain('petrol/electric', 'P')).toBe('phev')
    expect(eeaPowertrain('electric', 'E')).toBe('ev')
    expect(eeaPowertrain('hydrogen', 'M')).toBe('fcev')
  })

  it('maps fuel type to a category', () => {
    expect(eeaFuelCategory('Diesel')).toBe('diesel')
    expect(eeaFuelCategory('petrol/electric')).toBe('petrol')
    expect(eeaFuelCategory('lpg')).toBe('gas')
    expect(eeaFuelCategory('electric')).toBe('electric')
    expect(eeaFuelCategory('mystery')).toBeNull()
  })
})

describe('collapseEeaGroups', () => {
  it('merges variant names into one model with registration-weighted averages', () => {
    const rows = collapseEeaGroups(2024, [
      group({ Cn: 'COROLLA', regs: 300, co2: 100 }),
      group({ Cn: 'COROLLA   1.8   TS HIBRID CVT', regs: 100, co2: 140 })
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ source: 'eea', cycle: 'WLTP', modelKey: 'corolla', modelYear: 2024, co2GKm: 110 })
  })

  it('keeps hybrids, plug-ins and different cycles as separate rows', () => {
    const rows = collapseEeaGroups(2018, [group({ Fm: 'M' }), group({ Fm: 'H' }), group({ cyc: 'NEDC' })])
    expect(rows.map(r => r.powertrain).sort()).toEqual(['hybrid', 'ice', 'ice'])
  })

  it('converts EV consumption from Wh/km to kWh/100 km and skips groups without CO2', () => {
    const rows = collapseEeaGroups(2024, [
      group({ Cn: 'ID.3', Mk: 'VOLKSWAGEN', Ft: 'electric', Fm: 'E', ec: null, co2: 0, fc: null, z: 150 }),
      group({ Cn: 'BROKEN', co2: null })
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ co2GKm: 0, evKwh100km: 15, engineCc: null, fuelCategory: 'electric' })
  })
})

describe('buildGroupQuery', () => {
  it('groups server-side and filters by the slice', () => {
    const q = buildGroupQuery({ year: 2024, table: '[CO2Emission].[latest].[x]', where: '1 = 1' })
    expect(q).toContain('GROUP BY Mk, Cn, Ft, Fm')
    expect(q).toContain('FROM [CO2Emission].[latest].[x] WHERE 1 = 1')
  })
})
