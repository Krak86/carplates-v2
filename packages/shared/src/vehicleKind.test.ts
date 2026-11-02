import { describe, expect, it } from 'vitest'

import { resolveVehicleKind, sourceValueForKind, vehicleKindFromTitle, VEHICLE_KINDS } from './vehicleKind.js'

describe('vehicleKindFromTitle', () => {
  it('reads the kind a lot title names, a semi-trailer before a trailer', () => {
    expect(vehicleKindFromTitle('транспортний засіб Trailor S363EL, напівпричіп, з можливістю')).toBe('semiTrailer')
    expect(vehicleKindFromTitle('Причіп до легкового автомобіля')).toBe('trailer')
    expect(vehicleKindFromTitle('Мотоцикл Honda')).toBe('motorcycle')
  })

  it('is null when the title names no kind', () => {
    expect(vehicleKindFromTitle('Toyota Camry 2015')).toBeNull()
    expect(vehicleKindFromTitle(null)).toBeNull()
  })
})

describe('resolveVehicleKind', () => {
  it('maps every real registry kind value', () => {
    expect(resolveVehicleKind('ЛЕГКОВИЙ')).toBe('passenger')
    expect(resolveVehicleKind('ВАНТАЖНИЙ')).toBe('truck')
    expect(resolveVehicleKind('АВТОБУС')).toBe('bus')
    expect(resolveVehicleKind('МОТОЦИКЛ')).toBe('motorcycle')
    expect(resolveVehicleKind('МОПЕД')).toBe('moped')
    expect(resolveVehicleKind('ПРИЧІП')).toBe('trailer')
    expect(resolveVehicleKind('НАПІВПРИЧІП')).toBe('semiTrailer')
    expect(resolveVehicleKind('КВАДРОЦИКЛ')).toBe('quad')
    expect(resolveVehicleKind('ТРИЦИКЛ')).toBe('tricycle')
    expect(resolveVehicleKind('МОТОТРИЦИКЛ')).toBe('motoTricycle')
    expect(resolveVehicleKind('СПЕЦІАЛІЗОВАНІ')).toBe('specialized')
    expect(resolveVehicleKind('СПЕЦІАЛЬНІ')).toBe('special')
    expect(resolveVehicleKind('НЕВИЗНАЧЕНИЙ')).toBe('undetermined')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(resolveVehicleKind(' легковий ')).toBe('passenger')
  })

  it('returns null for unknown or missing values', () => {
    expect(resolveVehicleKind('SOMETHING ELSE')).toBeNull()
    expect(resolveVehicleKind(null)).toBeNull()
    expect(resolveVehicleKind(undefined)).toBeNull()
    expect(resolveVehicleKind('')).toBeNull()
  })
})

describe('VEHICLE_KINDS', () => {
  it('has one entry per real registry value', () => {
    expect(VEHICLE_KINDS).toHaveLength(13)
  })
})

describe('sourceValueForKind', () => {
  it('round-trips through resolveVehicleKind for every canonical kind', () => {
    for (const kind of VEHICLE_KINDS) {
      expect(resolveVehicleKind(sourceValueForKind(kind))).toBe(kind)
    }
  })
})
