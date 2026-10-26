import { describe, expect, it } from 'vitest'

import { buildWmiRows, countryNameToCode, isWantedManufacturer, vinRegion } from './wmi-parse.js'

describe('countryNameToCode', () => {
  it('maps NHTSA spellings', () => {
    expect(countryNameToCode('GERMANY')).toBe('DE')
    expect(countryNameToCode('UNITED KINGDOM (UK)')).toBe('GB')
    expect(countryNameToCode('UNITED STATES (USA)')).toBe('US')
    expect(countryNameToCode('SOUTH KOREA')).toBe('KR')
    expect(countryNameToCode('LATVIA ')).toBe('LV')
    expect(countryNameToCode('UKRAINE')).toBe('UA')
  })

  it('returns null for blank or unknown', () => {
    expect(countryNameToCode('')).toBeNull()
    expect(countryNameToCode(undefined)).toBeNull()
    expect(countryNameToCode('ATLANTIS')).toBeNull()
  })
})

describe('vinRegion', () => {
  it('follows the first character', () => {
    expect(vinRegion('WVW')).toBe('europe')
    expect(vinRegion('JTD')).toBe('asia')
    expect(vinRegion('1HG')).toBe('north-america')
    expect(vinRegion('6T1')).toBe('oceania')
    expect(vinRegion('9BW')).toBe('south-america')
    expect(vinRegion('AAV')).toBe('africa')
  })
})

describe('isWantedManufacturer', () => {
  it('keeps road vehicles (primary or not), drops trailers', () => {
    const base = { Mfr_ID: 1 }
    expect(isWantedManufacturer({ ...base, VehicleTypes: [{ IsPrimary: true, Name: 'Passenger Car' }] })).toBe(true)
    expect(isWantedManufacturer({ ...base, VehicleTypes: [{ IsPrimary: true, Name: 'Trailer' }] })).toBe(false)
    expect(isWantedManufacturer({ ...base, VehicleTypes: [{ IsPrimary: false, Name: 'Truck' }] })).toBe(true)
  })
})

describe('buildWmiRows', () => {
  it('prefers the common-name manufacturer and skips malformed WMIs', () => {
    const rows = buildWmiRows([
      { manufacturer: { Mfr_ID: 1, Mfr_Name: 'VOLKSWAGEN AG', Country: 'GERMANY' }, wmis: ['WVW', 'bad!'] },
      { manufacturer: { Mfr_ID: 2, Mfr_Name: 'X', Mfr_CommonName: 'Volkswagen', Country: 'GERMANY' }, wmis: ['wvw'] }
    ])
    expect(rows).toEqual([
      { wmi: 'WVW', fromYear: 0, toYear: null, maker: 'Volkswagen', countryCode: 'DE', region: 'europe' }
    ])
  })
})
