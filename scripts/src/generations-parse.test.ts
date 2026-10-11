import { describe, expect, it } from 'vitest'

import {
  cleanWikitext,
  finishGenerations,
  generationCode,
  generationName,
  headingGenerations,
  infoboxField,
  infoboxYears,
  parseYearRange,
  trustedHeadings,
  type Generation
} from './generations-parse.js'

const gen = (yearFrom: number, yearTo: number | null, code = ''): Generation => ({
  code,
  label: code,
  yearFrom,
  yearTo,
  bodyStyles: '',
  platform: '',
  wikiTitle: '',
  wikidataId: '',
  source: 'wikidata'
})

describe('cleanWikitext', () => {
  it('drops refs and templates, unwraps links', () => {
    expect(cleanWikitext('[[Sedan (car)|sedan]]<ref>x</ref> {{nowrap|1996}}<!-- c -->')).toBe('sedan 1996')
  })
})

describe('parseYearRange', () => {
  it('reads ranges, open ranges and short ends', () => {
    expect(parseYearRange('1996–2001')).toEqual({ from: 1996, to: 2001 })
    expect(parseYearRange('February 2006 – present')).toEqual({ from: 2006, to: null })
    expect(parseYearRange('1996–01')).toEqual({ from: 1996, to: 2001 })
    expect(parseYearRange('January 1994 – March 2015 (LHD), January 1994 – February 2012')).toEqual({
      from: 1994,
      to: 2015
    })
    expect(parseYearRange('2018')).toEqual({ from: 2018, to: undefined })
    expect(parseYearRange('none')).toBeNull()
  })

  it('takes the first range, not the regional ones', () => {
    expect(parseYearRange('1974–1983 South Africa 1984–2009')).toEqual({ from: 1974, to: 1983 })
  })
})

describe('infoboxField / infoboxYears', () => {
  const box = `{{Infobox automobile
| name = Toyota Camry
| production = {{plainlist|
* 1991–1996 (Japan)
* 1991–1997 (US)}}
| model_years = 1992–1996
| body_style = [[Sedan (automobile)|4-door sedan]]
| platform = [[Toyota TNGA]]
}}`

  it('extracts and cleans a field', () => {
    expect(infoboxField(box, 'body_style')).toBe('4-door sedan')
    expect(infoboxField(box, 'platform')).toBe('Toyota TNGA')
    expect(infoboxField(box, 'missing')).toBe('')
  })

  it('takes the earlier start of model_years and production', () => {
    expect(infoboxYears(box)).toEqual({ from: 1991, to: 1996 })
  })
})

describe('generationCode', () => {
  it('reads the parenthesis or a known suffix', () => {
    expect(generationCode('Toyota Camry (XV40)', 'Toyota Camry')).toBe('XV40')
    expect(generationCode('Volkswagen Golf Mk5', 'Volkswagen Golf')).toBe('Mk5')
    expect(generationCode('BMW 3 Series (E46)', 'BMW 3 Series')).toBe('E46')
    expect(generationCode('Toyota Camry (2006)', 'Toyota Camry')).toBeNull()
    expect(generationCode('Toyota Camry', 'Toyota Camry')).toBeNull()
    expect(generationCode('Honda Accord (Japan and Europe seventh generation)', 'Honda Accord')).toBeNull()
    expect(generationCode('Audi A4 (Typ 8E)', 'Audi A4')).toBe('Typ 8E')
  })
})

describe('headingGenerations', () => {
  it('reads number, code and start year', () => {
    const wt = `== History ==\n==First generation (Typ 1U; 1996)==\ntext\n=== Third generation (J12; 2021) ===\n== Second generation (2007–2013) ==\n== Awards ==`
    expect(headingGenerations(wt)).toEqual([
      { label: 'First generation', code: 'Typ 1U', yearFrom: 1996, ordinal: 1 },
      { label: 'Third generation', code: 'J12', yearFrom: 2021, ordinal: 3 },
      { label: 'Second generation', code: '', yearFrom: 2007, ordinal: 2 }
    ])
  })
})

describe('trustedHeadings', () => {
  it('drops the generation before a missing ordinal', () => {
    const h = (ordinal: number, yearFrom: number) => ({ label: '', code: '', yearFrom, ordinal })
    expect(trustedHeadings([h(1, 1991), h(3, 2004), h(4, 2009)]).map(g => g.ordinal)).toEqual([3, 4])
  })
})

describe('finishGenerations', () => {
  const list = finishGenerations([
    gen(2006, null, 'XV40'),
    gen(1991, 1996, 'XV10'),
    gen(1996, 2001, 'XV20'),
    gen(2001, 2006, 'XV30')
  ])

  it('orders, and fills open ends from the next start', () => {
    expect(list.map(g => [g.code, g.yearFrom, g.yearTo])).toEqual([
      ['XV10', 1991, 1996],
      ['XV20', 1996, 2001],
      ['XV30', 2001, 2006],
      ['XV40', 2006, null]
    ])
  })

  it('clamps an end that overruns the next start (regional noise)', () => {
    const noisy = finishGenerations([gen(1974, 2009, 'Mk1'), gen(1983, 1991, 'Mk2')])
    expect(noisy[0]!.yearTo).toBe(1983)
  })
})

describe('generationName', () => {
  it('names generation articles and rejects variants', () => {
    expect(generationName('Ford Focus (first generation)', 'Ford Focus')).toEqual({
      code: '',
      label: 'First generation'
    })
    expect(generationName('Ford Focus (second generation, Europe)', 'Ford Focus')?.label).toBe('Second generation')
    expect(generationName('Ford Focus (second generation, North America)', 'Ford Focus')).toBeNull()
    expect(generationName('Toyota Camry (XV40)', 'Toyota Camry')).toEqual({ code: 'XV40', label: 'XV40' })
    expect(generationName('Audi S6', 'Audi A6')).toBeNull()
    expect(generationName('Toyota Camry (XV40) facelift', 'Toyota Camry')).toBeNull()
  })
})

describe('finishGenerations variants', () => {
  it('drops a variant article nested inside another generation', () => {
    const list = finishGenerations([gen(2013, 2018, 'F15'), gen(2014, 2018, 'F85'), gen(2018, null, 'G05')])
    expect(list.map(g => g.code)).toEqual(['F15', 'G05'])
  })
})
