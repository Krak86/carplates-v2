import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { expandWikitext, parseEngine, parseMeasure, parseWikiSpecs } from './wikiSpecs.js'

const LENGTH = [1000, 25000] as const

describe('expandWikitext', () => {
  it('expands convert / cvt to the first unit and drops refs', () => {
    expect(expandWikitext('{{convert|2700|mm|in|1}}<ref>x</ref>')).toEqual(['2700 mm'])
    expect(expandWikitext('{{cvt|1400|-|1600|kg|lb}}')).toEqual(['1400–1600 kg'])
  })

  it('splits <br> and list templates into lines', () => {
    expect(expandWikitext('A<br>B<br />C')).toEqual(['A', 'B', 'C'])
    expect(expandWikitext('{{plainlist|\n* one\n* two\n}}')).toEqual(['one', 'two'])
    expect(expandWikitext('{{unbulleted list|[[Petrol|petrol]] 1.6|diesel 2.0}}')).toEqual(['petrol 1.6', 'diesel 2.0'])
  })
})

describe('parseMeasure', () => {
  it('takes a single value, also when given in two units', () => {
    expect(parseMeasure(['4,885 mm (192.3 in)'], 'length', LENGTH)?.value).toBe(4885)
    expect(parseMeasure(['192.3 in'], 'length', LENGTH)?.value).toBe(4884)
  })

  it('reads a min–max range', () => {
    expect(parseMeasure(['1,400–1,600 kg'], 'mass', [50, 60000])).toEqual({ value: 1500, min: 1400, max: 1600 })
  })

  it('refuses a list of different variants', () => {
    expect(parseMeasure(['Sedan: 4885 mm', 'Wagon: 4930 mm'], 'length', LENGTH)).toBeNull()
  })

  it('refuses values outside the bounds (typo / wrong unit)', () => {
    expect(parseMeasure(['48850 mm'], 'length', LENGTH)).toBeNull()
    expect(parseMeasure(['4.5 m'], 'length', [100, 1000])).toBeNull()
  })

  it('converts litres and US gallons', () => {
    expect(parseMeasure(['60 L'], 'volume', [3, 1500])?.value).toBe(60)
    expect(parseMeasure(['13.2 US gal'], 'volume', [3, 1500])?.value).toBe(50)
  })
})

describe('parseEngine', () => {
  it('reads displacement, cylinders, power and fuel', () => {
    expect(parseEngine('1.6 L I4 (petrol) 110 PS')).toMatchObject({
      displacementCc: 1600,
      cylinders: 4,
      powerKw: 81,
      fuel: 'petrol'
    })
    expect(parseEngine('2.0 L TDI I4 110 kW')).toMatchObject({
      displacementCc: 2000,
      cylinders: 4,
      powerKw: 110,
      fuel: 'diesel'
    })
    expect(parseEngine('3.5 L V6 268 hp')).toMatchObject({ cylinders: 6, powerKw: 200 })
  })

  it('leaves unknown fields null and keeps the raw line', () => {
    expect(parseEngine('Electric motor')).toMatchObject({
      displacementCc: null,
      cylinders: null,
      powerKw: null,
      fuel: 'electric'
    })
  })
})

describe('parseWikiSpecs', () => {
  const page = `{{Infobox automobile
| name = Test
| layout = [[Front-engine, front-wheel-drive layout|Front-engine, front-wheel-drive]]
| engine = {{unbulleted list|1.6 L I4 (petrol) 110 PS|2.0 L I4 (diesel) 130 kW}}
| wheelbase = {{convert|2700|mm|in}}<ref>x</ref>
| length = 4,600–4,700 mm
| weight = {{convert|1300|to|1500|kg|lb}}
| height = 1,450 mm (57.1 in)
| width = Sedan: 1800 mm<br>Wagon: 1830 mm
}}
lead text`

  it('parses the infobox fields', () => {
    const s = parseWikiSpecs(page)
    expect(s.wheelbaseMm?.value).toBe(2700)
    expect(s.lengthMm).toEqual({ value: 4650, min: 4600, max: 4700 })
    expect(s.kerbKg).toEqual({ value: 1400, min: 1300, max: 1500 })
    expect(s.heightMm?.value).toBe(1450)
    expect(s.layout).toBe('Front-engine, front-wheel-drive')
    expect(s.engines).toHaveLength(2)
  })

  it('keeps an ambiguous field as raw text only', () => {
    const s = parseWikiSpecs(page)
    expect(s.widthMm).toBeNull()
    expect(s.rawOnly.width).toContain('Wagon')
  })

  it('returns empty specs for a page without an infobox', () => {
    expect(parseWikiSpecs('just text').engines).toEqual([])
  })
})

describe('parseWikiSpecs: motorcycle infobox', () => {
  const specs = parseWikiSpecs(readFileSync(new URL('./fixtures/wiki/mt07.en.wikitext', import.meta.url), 'utf8'), {
    lang: 'en'
  })

  it('reads dimensions, tank and the wet weight as the kerb mass', () => {
    expect(specs.wheelbaseMm?.value).toBe(1400)
    expect(specs.lengthMm?.value).toBe(2085)
    expect(specs.kerbKg?.value).toBe(179)
    expect(specs.fuelTankL?.value).toBe(14)
    expect(specs.transmission).toContain('6-speed')
  })

  it('takes the power of the separate `power` field for a lone engine', () => {
    expect(specs.engines).toHaveLength(1)
    expect(specs.engines[0]).toMatchObject({ displacementCc: 689, powerKw: 55 })
  })
})
