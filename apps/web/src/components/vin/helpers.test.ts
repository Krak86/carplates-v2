import { describe, expect, it } from 'vitest'

import {
  buildSchematicModel,
  countryFlag,
  enginePower,
  formatFieldValue,
  groupFields,
  hasCarSchematicData,
  gvwrClass,
  parseAirbagLocations,
  parseDriveType,
  resolveYear,
  splitVin,
  toFieldMap,
  vehicleShape
} from '@/components/vin/helpers'

describe('splitVin', () => {
  it('splits a 17-char VIN into WMI / VDS / check / year / plant / serial', () => {
    const segs = splitVin('KNDPMCAC7H7123456')
    expect(segs?.map(s => s.text)).toEqual(['KND', 'PMCAC', '7', 'H', '7', '123456'])
  })

  it('rejects wrong lengths and forbidden letters', () => {
    expect(splitVin('KNDPMCAC7H71234')).toBeNull()
    expect(splitVin('KNDPMCAC7H712345O')).toBeNull()
  })
})

describe('resolveYear', () => {
  it('prefers the cycle year NHTSA agrees with', () => {
    expect(resolveYear('H', '2017', 2026)).toBe(2017)
    expect(resolveYear('H', '1987', 2026)).toBe(1987)
  })

  it('falls back to the latest plausible year', () => {
    expect(resolveYear('T', undefined, 2026)).toBe(2026)
    expect(resolveYear('H', undefined, 2026)).toBe(2017)
  })

  it('returns null for characters that are never year codes', () => {
    expect(resolveYear('U', undefined)).toBeNull()
  })
})

describe('parseAirbagLocations', () => {
  it('reads rows and sides', () => {
    expect(parseAirbagLocations('1st Row (Driver and Passenger)')).toEqual({ rows: [1], driver: true, passenger: true })
    expect(parseAirbagLocations('1st and 2nd Rows')).toEqual({ rows: [1, 2], driver: true, passenger: true })
    expect(parseAirbagLocations('1st Row (Driver only)')).toEqual({ rows: [1], driver: true, passenger: false })
  })

  it('treats N/A and absent as no airbag', () => {
    expect(parseAirbagLocations('Not Applicable')).toBeNull()
    expect(parseAirbagLocations(undefined)).toBeNull()
  })
})

describe('parseDriveType', () => {
  it('maps NHTSA drive strings', () => {
    expect(parseDriveType('4WD/4-Wheel Drive/4x4')).toBe('awd')
    expect(parseDriveType('AWD/All-Wheel Drive')).toBe('awd')
    expect(parseDriveType('FWD/Front-Wheel Drive')).toBe('fwd')
    expect(parseDriveType('RWD/Rear-Wheel Drive')).toBe('rwd')
    expect(parseDriveType('weird')).toBeNull()
  })
})

describe('groupFields', () => {
  const results = [
    { variable: 'Make', value: 'KIA' },
    { variable: 'Error Code', value: '0' },
    { variable: 'Trailer Type Connection', value: 'Not Applicable' },
    { variable: 'Curtain Air Bag Locations', value: '1st and 2nd Rows' },
    { variable: 'Plant City', value: 'GWANG-JU' }
  ]

  it('drops Not Applicable rows and decoder bookkeeping, keeping section order', () => {
    const groups = groupFields(results)
    expect(groups.map(g => g.group)).toEqual(['identity', 'safety', 'manufacturing'])
    const variables = groups.flatMap(g => g.rows).map(r => r.variable)
    expect(variables).not.toContain('Trailer Type Connection')
    expect(variables).not.toContain('Error Code')
  })
})

describe('vehicleShape', () => {
  const shape = (type?: string, body?: string): ReturnType<typeof vehicleShape> =>
    vehicleShape(
      toFieldMap([
        ...(type ? [{ variable: 'Vehicle Type', value: type }] : []),
        ...(body ? [{ variable: 'Body Class', value: body }] : [])
      ])
    )

  it('picks a plan per vehicle class', () => {
    expect(shape('PASSENGER CAR')).toBe('car')
    expect(shape('MULTIPURPOSE PASSENGER VEHICLE (MPV)')).toBe('car')
    expect(shape('MOTORCYCLE')).toBe('motorcycle')
    expect(shape(undefined, 'Motorcycle - Standard')).toBe('motorcycle')
    expect(shape('BUS')).toBeNull()
    expect(shape('TRAILER')).toBeNull()
  })
})

describe('hasCarSchematicData', () => {
  it('is false when nothing but guessed seats is known', () => {
    expect(hasCarSchematicData(buildSchematicModel(toFieldMap([])))).toBe(false)
    expect(hasCarSchematicData(buildSchematicModel(toFieldMap([{ variable: 'Doors', value: '4' }])))).toBe(true)
  })
})

describe('formatFieldValue', () => {
  it('cleans float noise and adds units', () => {
    expect(formatFieldValue('Displacement (CI)', '146.45698582735')).toBe('146.5 cu in')
    expect(formatFieldValue('Displacement (CC)', '2400.0')).toBe('2400 cc')
    expect(formatFieldValue('Displacement (L)', '2.4')).toBe('2.4 L')
    expect(formatFieldValue('Engine Brake (hp) From', '181')).toBe('181 hp')
    expect(formatFieldValue('Make', 'KIA')).toBe('KIA')
  })
})

describe('enginePower', () => {
  it('derives the missing unit', () => {
    expect(enginePower(toFieldMap([{ variable: 'Engine Brake (hp) From', value: '181' }]))).toEqual({
      hp: 181,
      kw: 135
    })
    expect(enginePower(toFieldMap([{ variable: 'Engine Power (kW)', value: '100' }]))).toEqual({ hp: 134, kw: 100 })
    expect(enginePower(toFieldMap([]))).toEqual({ hp: null, kw: null })
  })
})

describe('buildSchematicModel', () => {
  it('infers seat rows from airbags when not declared', () => {
    const m = buildSchematicModel(
      toFieldMap([{ variable: 'Curtain Air Bag Locations', value: '1st, 2nd and 3rd Rows' }])
    )
    expect(m.rows).toBe(3)
    expect(m.rowsInferred).toBe(true)
  })

  it('trusts a declared row count', () => {
    const m = buildSchematicModel(toFieldMap([{ variable: 'Number of Seat Rows', value: '2' }]))
    expect(m.rows).toBe(2)
    expect(m.rowsInferred).toBe(false)
  })
})

describe('misc', () => {
  it('maps a plant country to a flag emoji', () => {
    expect(countryFlag('SOUTH KOREA')).toBe('🇰🇷')
    expect(countryFlag('Atlantis')).toBeNull()
  })

  it('reads the GVWR class', () => {
    expect(gvwrClass('Class 1C: 4,001 - 5,000 lb (1,814 - 2,268 kg)')).toBe(1)
    expect(gvwrClass('n/a')).toBeNull()
  })
})
