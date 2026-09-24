import { describe, expect, it } from 'vitest'

import { resolveVehicleKind, VEHICLE_KINDS } from './vehicleKind.js'

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
