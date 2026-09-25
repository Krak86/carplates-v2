import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cncapApiRecordSchema, parseRecord } from './cncap-parse.js'
import type { CncapNames } from './cncap-parse.js'

const fixtures = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'cncap-records.json'), 'utf8')
) as unknown[]

const NAMES: CncapNames = {
  109: { make: 'HONDA', model: 'CITY' },
  387: { make: 'TOYOTA', model: 'CAMRY' },
  124: { make: 'ZHONGHUA', model: 'V7' },
  758: { make: 'BUICK', model: 'ZHIJING L7' }
}

function record(index: number): ReturnType<typeof cncapApiRecordSchema.parse> {
  return cncapApiRecordSchema.parse(fixtures[index])
}

describe('parseRecord', () => {
  it('parses a pre-2018 raw-points record with a single occupant-protection sub-score', () => {
    const row = parseRecord(record(0), NAMES)
    expect(row).toMatchObject({
      assessmentId: '2f8f5f77bedf4da59a80118223967a83',
      carId: 109,
      make: 'HONDA',
      model: 'CITY',
      makeKey: 'honda',
      modelKey: 'city',
      nameZh: '本田思迪',
      vehicleClass: 'classAPassenger',
      ratingYear: 2006,
      scoreUnit: 'points',
      overallScore: 41.1,
      occupantScore: 41.1,
      vruScore: null,
      activeSafetyScore: null
    })
  })

  it('parses a 2018 raw-points record (still pre-protocol-change despite the year)', () => {
    const row = parseRecord(record(1), NAMES)
    expect(row).toMatchObject({
      make: 'TOYOTA',
      model: 'CAMRY',
      vehicleClass: 'classBPassenger',
      ratingYear: 2018,
      scoreUnit: 'points',
      overallScore: 56.3,
      occupantScore: 56.3,
      vruScore: null,
      activeSafetyScore: null
    })
  })

  it('parses a 2018 percentage record with all three sub-scores', () => {
    const row = parseRecord(record(2), NAMES)
    expect(row).toMatchObject({
      make: 'ZHONGHUA',
      model: 'V7',
      vehicleClass: 'suv',
      scoreUnit: 'pct',
      overallScore: 83.9,
      occupantScore: 87.1,
      vruScore: 75.18,
      activeSafetyScore: 77.48
    })
  })

  it('parses a current-era percentage record', () => {
    const row = parseRecord(record(3), NAMES)
    expect(row).toMatchObject({
      make: 'BUICK',
      model: 'ZHIJING L7',
      vehicleClass: 'sedan',
      ratingYear: 2026,
      scoreUnit: 'pct',
      overallScore: 89.7,
      occupantScore: 91.97,
      vruScore: 86.53,
      activeSafetyScore: 87.47
    })
  })

  it('returns null for a carId missing from the translation table', () => {
    const untranslated = cncapApiRecordSchema.parse({ ...fixtures[3] as object, carId: 999999 })
    expect(parseRecord(untranslated, NAMES)).toBeNull()
  })

  it('maps an unrecognized carKind to a null vehicleClass rather than guessing', () => {
    const unknownKind = cncapApiRecordSchema.parse({ ...(fixtures[3] as object), carKind: '未知类别' })
    expect(parseRecord(unknownKind, NAMES)?.vehicleClass).toBeNull()
  })
})
