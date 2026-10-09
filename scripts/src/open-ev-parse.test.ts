import { describe, it, expect } from 'vitest'

import { parseEvEntry } from './open-ev-parse.js'

describe('parseEvEntry', () => {
  it('maps a full BEV entry', () => {
    const row = parseEvEntry({
      id: 'x1',
      brand: 'Mercedes Benz',
      model: 'EQC',
      type: 'bev',
      variant: '',
      release_year: 2019,
      usable_battery_size: 80,
      ac_charger: { usable_phases: 3, ports: ['type2'], max_power: 7.4 },
      dc_charger: { ports: ['ccs'], max_power: 125, charging_curve: [] },
      energy_consumption: { average_consumption: 21.6 }
    })
    expect(row).toMatchObject({
      id: 'x1',
      modelKey: 'eqc',
      powertrain: 'bev',
      releaseYear: 2019,
      batteryKwh: 80,
      consumptionKwh100: 21.6,
      acMaxKw: 7.4,
      acPhases: 3,
      acPorts: ['type2'],
      dcMaxKw: 125,
      dcPorts: ['ccs']
    })
  })

  it('keeps an entry with no DC charger and treats a missing release year as null', () => {
    const row = parseEvEntry({
      id: 'x2',
      brand: 'Renault',
      model: 'Twizy',
      type: 'bev',
      release_year: null,
      usable_battery_size: 6.1,
      ac_charger: { ports: ['type2'], max_power: 3.6 }
    })
    expect(row?.releaseYear).toBeNull()
    expect(row?.dcMaxKw).toBeNull()
    expect(row?.dcPorts).toEqual([])
  })

  it('drops malformed entries', () => {
    expect(parseEvEntry({ id: 'x3', brand: 'Tesla', model: 'Model 3', type: 'fcev' })).toBeNull()
    expect(parseEvEntry('nope')).toBeNull()
  })
})
