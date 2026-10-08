import { describe, expect, it } from 'vitest'

import { dedupeByKey, parseSpecsRecord, specsQuery } from './rdw-parse.js'

const rec = {
  voertuigsoort: 'Personenauto',
  handelsbenaming: 'GOLF VARIANT',
  y: '2018',
  n: '120',
  kw_min: '66.00',
  kw_median: '85',
  kw_max: '110.00',
  cc_median: '1498',
  kg_median: '1290'
}

describe('parseSpecsRecord', () => {
  it('maps a SODA group to an insert row with keys', () => {
    const row = parseSpecsRecord('VOLKSWAGEN', rec, 3, 2027)
    expect(row).toMatchObject({
      kind: 'car',
      makeKey: 'volkswagen',
      modelKey: 'golfvariant',
      modelYear: 2018,
      n: 120,
      powerKwMin: 66,
      powerKwMedian: 85,
      displacementCcMedian: 1498,
      co2GKmMedian: null
    })
  })

  it('maps Bedrijfsauto to the truck class', () => {
    expect(parseSpecsRecord('FORD', { ...rec, voertuigsoort: 'Bedrijfsauto' }, 3, 2027)?.kind).toBe('truck')
  })

  it('drops tiny groups, unknown kinds and impossible years', () => {
    expect(parseSpecsRecord('VOLKSWAGEN', { ...rec, n: '2' }, 3, 2027)).toBeNull()
    expect(parseSpecsRecord('VOLKSWAGEN', { ...rec, voertuigsoort: 'Aanhangwagen' }, 3, 2027)).toBeNull()
    expect(parseSpecsRecord('VOLKSWAGEN', { ...rec, y: '2099' }, 3, 2027)).toBeNull()
    expect(parseSpecsRecord('VOLKSWAGEN', { ...rec, y: undefined }, 3, 2027)).toBeNull()
    expect(parseSpecsRecord('VOLKSWAGEN', { ...rec, handelsbenaming: '-' }, 3, 2027)).toBeNull()
  })
})

describe('dedupeByKey', () => {
  it('keeps the larger group when two spellings share a key', () => {
    const a = parseSpecsRecord('VOLKSWAGEN', { ...rec, handelsbenaming: 'GOLF', n: '10' }, 3, 2027)!
    const b = parseSpecsRecord('VOLKSWAGEN', { ...rec, handelsbenaming: 'Golf', n: '50' }, 3, 2027)!
    expect(dedupeByKey([a, b])).toEqual([b])
  })
})

describe('specsQuery', () => {
  it('escapes quotes in the make and adds the year filter only when asked', () => {
    expect(specsQuery("D'IETEREN")).toContain("merk='D''IETEREN'")
    expect(specsQuery('VOLVO')).not.toContain('date_extract_y(datum_eerste_toelating_dt) = ')
    expect(specsQuery('VOLVO', 2015)).toContain('date_extract_y(datum_eerste_toelating_dt) = 2015')
  })
})
