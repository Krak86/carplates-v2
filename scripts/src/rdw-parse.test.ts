import { describe, expect, it } from 'vitest'

import { BODY_TYPES, COLOURS, dedupeByKey, parseSpecsRecord, parseTally, specsQuery } from './rdw-parse.js'

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

  it('maps the stage C2 measures and the counts of the partially filled ones', () => {
    const row = parseSpecsRecord(
      'VOLKSWAGEN',
      { ...rec, gross_median: '1840', wb_median: '264', seats_median: '5', len_median: '429', len_n: '31', spd_n: '4' },
      3,
      2027
    )
    expect(row).toMatchObject({
      grossMassKgMedian: 1840,
      wheelbaseCmMedian: 264,
      seatsMedian: 5,
      lengthCmMedian: 429,
      lengthCmN: 31,
      topSpeedKmhN: 4,
      doorsMedian: null,
      widthCmN: null
    })
  })

  it('maps the stage C3 ranges, counts and the recall tally', () => {
    const row = parseSpecsRecord(
      'VOLKSWAGEN',
      {
        ...rec,
        price_min: '20000',
        price_median: '31000',
        price_max: '60000',
        price_n: '118',
        pxt_median: '21518.3760330579',
        bpm_n: '0',
        cons_median: '5.8',
        cons_n: '90',
        rc_open: '4',
        rc_n: '120',
        fuel_n: '120'
      },
      3,
      2027
    )
    expect(row).toMatchObject({
      priceEurMin: 20000,
      priceEurMedian: 31000,
      priceEurN: 118,
      priceExTaxEurMedian: 21518.3760330579,
      bpmEurN: 0,
      bpmEurMedian: null,
      consumptionL100Median: 5.8,
      consumptionL100N: 90,
      recallOpenN: 4,
      recallN: 120,
      fuelMixN: 120,
      fuelMix: null,
      colours: null,
      evKwh100N: null
    })
  })

  it('maps the fuel mix by class, largest first, skipping empty classes', () => {
    const row = parseSpecsRecord(
      'VOLKSWAGEN',
      {
        ...rec,
        fuel_petrol: '70',
        fuel_diesel: '10',
        fuel_ev: '0',
        fuel_hev: '25',
        fuel_phev: '5',
        fuel_gas: '0',
        fuel_n: '110'
      },
      3,
      2027
    )
    expect(row?.fuelMix).toEqual([
      ['petrol', 70],
      ['hev', 25],
      ['diesel', 10],
      ['phev', 5]
    ])
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

describe('parseTally', () => {
  it('turns indexed conditional counts into the top values, largest first', () => {
    const rec = { col_0: '1864', col_1: '1706', col_2: '625', col_3: '613', col_4: '0' }
    expect(parseTally(rec, 'col', COLOURS, 3)).toEqual([
      ['GRIJS', 1864],
      ['ZWART', 1706],
      ['WIT', 625]
    ])
  })

  it('is null when nothing was counted', () => {
    expect(parseTally({ body_0: '0' }, 'body', BODY_TYPES, 3)).toBeNull()
    expect(parseTally({}, 'body', BODY_TYPES, 3)).toBeNull()
  })
})

describe('specsQuery', () => {
  it('adds the C3 aggregates: bounded price with an ex-tax variant, tallies, recall counts', () => {
    const q = specsQuery('VOLVO')
    expect(q).toContain(
      'median(case(catalogusprijs >= 1000 AND catalogusprijs <= 2000000, catalogusprijs)) as price_median'
    )
    expect(q).toContain('catalogusprijs / 1.21 - bruto_bpm')
    expect(q).toContain("count(case(eerste_kleur='GRIJS', 1)) as col_0")
    expect(q).toContain("count(case(@f.klasse_hybride_elektrisch_voertuig='OVC-HEV', 1)) as fuel_phev")
    expect(q).toContain("count(case(openstaande_terugroepactie_indicator='Ja', 1)) as rc_open")
    expect(q).toContain('::number')
  })

  it('joins one fuel row per vehicle: the second row for a hybrid whose first is electricity', () => {
    const q = specsQuery('TOYOTA')
    expect(q).toContain("brandstof_volgnummer='2' AND klasse_hybride_elektrisch_voertuig IS NOT NULL")
  })

  it('aggregates the C2 columns NULL-safe and bounded, counting the partial ones', () => {
    const q = specsQuery('VOLVO')
    expect(q).toContain('toegestane_maximum_massa_voertuig')
    expect(q).toContain('median(case(lengte >= 100 AND lengte <= 2500, lengte)) as len_median')
    expect(q).toContain('count(case(maximale_constructiesnelheid >= 20')
    expect(q).toContain('as spd_n')
  })

  it('escapes quotes in the make and adds the year filter only when asked', () => {
    expect(specsQuery("D'IETEREN")).toContain("merk='D''IETEREN'")
    expect(specsQuery('VOLVO')).not.toContain('date_extract_y(datum_eerste_toelating_dt) = ')
    expect(specsQuery('VOLVO', 2015)).toContain('date_extract_y(datum_eerste_toelating_dt) = 2015')
  })
})
