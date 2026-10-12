import { describe, expect, it } from 'vitest'

import { parseCurated } from './wikispecs-curated-parse.js'

const row = (over: Record<string, string> = {}): Record<string, string> => ({
  make_key: 'bajaj',
  model_key: 'boxerbm150',
  make: 'Bajaj',
  model: 'Boxer BM 150',
  source_label: 'Bajaj Auto',
  source_url: 'https://www.bajajauto.com/en-cr/bikes/boxer-bm150',
  accessed: '2026-10-12',
  displacement_cc: '144.8',
  power_ps: '12',
  fuel: 'petrol',
  wheelbase_mm: '1285',
  kerb_kg: '125',
  ...over
})

describe('parseCurated', () => {
  it('builds a generation row spanning every year and a spec row carrying the citation', () => {
    const { rows, dropped } = parseCurated([row()])
    expect(dropped).toEqual([])
    const [r] = rows
    expect(r).toMatchObject({ source: 'curated', yearFrom: 1900, yearTo: null, label: '' })
    expect(r!.spec).toMatchObject({
      sourceLabel: 'Bajaj Auto',
      sourceUrl: 'https://www.bajajauto.com/en-cr/bikes/boxer-bm150',
      sourceAccessed: '2026-10-12',
      srcLang: 'curated',
      enginesLang: 'curated',
      wheelbaseMm: 1285,
      kerbKg: 125,
      lengthMm: null
    })
  })

  it('converts PS to kW, one decimal', () => {
    expect(parseCurated([row()]).rows[0]!.spec.engines).toEqual([
      { displacementCc: 144.8, cylinders: null, powerKw: 8.8, fuel: 'petrol', raw: '' }
    ])
  })

  it('drops a row with fewer than 3 sourced figures', () => {
    const { rows, dropped } = parseCurated([row({ power_ps: '', wheelbase_mm: '' })])
    expect(rows).toEqual([])
    expect(dropped[0]!.reason).toMatch(/2 sourced figure/)
  })

  it('drops a row without a full citation, an unknown fuel and a duplicate key', () => {
    const { rows, dropped } = parseCurated([
      row({ accessed: '' }),
      row({ source_url: 'http://x' }),
      row({ fuel: 'steam' }),
      row(),
      row()
    ])
    expect(rows).toHaveLength(1)
    expect(dropped.map(d => d.reason)).toEqual([
      expect.stringMatching(/source_label/),
      expect.stringMatching(/source_label/),
      expect.stringMatching(/unknown fuel/),
      'duplicate key'
    ])
  })

  it('leaves the engine block empty without displacement and power', () => {
    const spec = parseCurated([row({ displacement_cc: '', power_ps: '', length_mm: '2016', width_mm: '740' })]).rows[0]!
      .spec
    expect(spec.engines).toEqual([])
    expect(spec.enginesLang).toBe('')
  })
})
