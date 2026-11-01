import { describe, expect, it } from 'vitest'

import { prozorroRow, unionRow } from './auctions-union.fixtures.js'
import { unionRowToLot } from './auctions-union.js'
import { mergeVehicle } from './vehicle-merge.js'

const lot = (row: ReturnType<typeof unionRow>) => unionRowToLot(row)

describe('mergeVehicle', () => {
  it('is null without lots', () => {
    expect(mergeVehicle([])).toBeNull()
  })

  it('takes a SETAM-only car as parsed, no conflicts', () => {
    const v = mergeVehicle([lot(unionRow())])
    expect(v).toMatchObject({
      make: 'SUBARU',
      model: 'FORESTER',
      year: 2007,
      plate: 'АА2335ЕТ',
      vin: null,
      conflicts: []
    })
  })

  it('prefers Prozorro structured values and fills the gaps from SETAM (Renault VF611GTA000122884)', () => {
    const setam = lot(
      unionRow({ make: 'RENAULT', model: '11GTA', year: 2003, plate: null, vin: 'VF611GTA000122884', color: null })
    )
    const v = mergeVehicle([setam, lot(prozorroRow())])
    expect(v).toMatchObject({
      make: 'RENAULT',
      model: '11GTA',
      year: 2003,
      plate: 'АА3895КК',
      vin: 'VF611GTA000122884',
      color: 'білий',
      kilometrage: 988816,
      damaged: false,
      conflicts: []
    })
  })

  it('flags a year that differs and keeps the Prozorro one first (Volvo XLBLX183EMC210919)', () => {
    const setam = lot(unionRow({ make: 'VOLVO', model: 'FH', year: 2013, vin: 'XLBLX183EMC210919' }))
    const prozorro = lot(prozorroRow({ make: 'Volvo ', model: 'FH', year: 2014, vin: 'XLBLX183EMC210919' }))
    const v = mergeVehicle([setam, prozorro])
    expect(v?.year).toBe(2014)
    expect(v?.conflicts).toEqual([
      {
        field: 'year',
        values: [
          { source: 'prozorro', value: 2014 },
          { source: 'setam', value: 2013 }
        ]
      }
    ])
  })

  it('does not flag make / model that differ only in case or spaces', () => {
    const v = mergeVehicle([
      lot(unionRow({ make: 'RENAULT', model: '11gta', year: 2003 })),
      lot(prozorroRow({ make: 'Renault ' }))
    ])
    expect(v?.conflicts).toEqual([])
  })

  it('inside one source the newest lot (first) wins, and a lot without the field is skipped', () => {
    const newest = lot(prozorroRow({ auction_id: 'BRE001-UA-20261001-1', color: null, year: 2005 }))
    const older = lot(prozorroRow({ auction_id: 'BRE001-UA-20260901-1', color: 'сірий', year: 2004 }))
    const v = mergeVehicle([newest, older])
    expect(v).toMatchObject({ color: 'сірий', year: 2005, conflicts: [] })
  })

  it('treats a lot saved without `source` as SETAM', () => {
    const legacy = { ...lot(unionRow({ year: 2001 })), source: undefined }
    const v = mergeVehicle([legacy, lot(prozorroRow({ year: 2002 }))])
    expect(v?.year).toBe(2002)
    expect(v?.conflicts[0]?.values.map(x => x.source)).toEqual(['prozorro', 'setam'])
  })
})
