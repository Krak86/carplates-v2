import { describe, expect, it } from 'vitest'

import {
  chainDefects,
  chainScore,
  cleanWikitext,
  fillGaps,
  finishGenerations,
  generationCode,
  generationName,
  headingGenerations,
  infoboxField,
  parseTitlePins,
  infoboxYears,
  parseYearRange,
  productionSpan,
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

describe('productionSpan', () => {
  it('takes the widest stated span, so licence-built years count (Lanos until 2017+)', () => {
    const lanos = `{{Infobox automobile\n| production = 1997–2002 (Daewoo)<br />1997–2020 (CKD and license-built models)\n| assembly = Ukraine (AvtoZAZ: 1998–2017)\n}}`
    expect(productionSpan(lanos)).toEqual({ from: 1997, to: 2020 })
  })

  it('leaves the end open for a model still produced', () => {
    expect(productionSpan('{{Infobox automobile\n| production = 2017–present\n}}')).toEqual({ from: 2017, to: null })
  })

  it('is null without any year', () => {
    expect(productionSpan('{{Infobox automobile\n| name = x\n}}')).toBeNull()
  })

  it('expands a short end year and narrows a multi-model field to the model (BMW F series)', () => {
    const f =
      '{{Infobox motorcycle\n| production = F800GS (2008–19)<br/>F800GSA (2013–19)<br/>F700GS (2012–19)<br/>F650GS (2008–12)\n}}'
    expect(productionSpan(f, 'F 700 GS')).toEqual({ from: 2012, to: 2019 })
    expect(productionSpan(f, 'F 800 GS')).toEqual({ from: 2008, to: 2019 })
    expect(productionSpan(f)).toEqual({ from: 2008, to: 2019 })
  })

  it('treats a lone start year as open-ended for motorcycles only', () => {
    expect(productionSpan('{{Infobox motorcycle\n| production = March 2011\n}}')).toEqual({ from: 2011, to: null })
    expect(productionSpan('{{Infobox automobile\n| production = March 2003\n}}')).toEqual({ from: 2003, to: 2003 })
  })
})

describe('chain quality', () => {
  const g = (code: string, from: number, to: number | null): Generation => ({ ...gen(from, to, code) })

  it('counts holes and clamped mid-list spans', () => {
    expect(chainDefects([g('a', 2000, 2005), g('b', 2005, 2010)])).toBe(0)
    expect(chainDefects([g('a', 2000, 2005), g('b', 2008, 2012)])).toBe(1)
    expect(chainDefects([g('a', 2008, 2009), g('b', 2009, null)])).toBe(1)
    expect(chainScore([g('a', 2000, 2005), g('b', 2008, 2012), g('c', 2012, null)])).toBe(1)
  })

  it('fills a hole and a missing newest generation from other sources', () => {
    const best = [g('B6', 2005, 2010), g('B8', 2014, 2021)]
    const others = [g('B7', 2010, 2014), g('B6', 2005, 2010), g('B9', 2021, null)]
    expect(fillGaps(best, others).map(x => [x.code, x.yearFrom, x.yearTo])).toEqual([
      ['B6', 2005, 2010],
      ['B7', 2010, 2014],
      ['B8', 2014, 2021],
      ['B9', 2021, null]
    ])
  })

  it('leaves a clean chain alone and ignores a generation that overlaps one', () => {
    const best = [g('a', 2000, 2005), g('b', 2005, 2010)]
    expect(fillGaps(best, [g('x', 2003, 2007)])).toBe(best)
  })
})

describe('headingGenerations: coded headings', () => {
  it('reads a platform code between the ordinal and the parenthesis (Kangoo)', () => {
    const wt = `== First generation X76 (FC/KC; 1997) ==\n== Second generation X61 (FW/KW; 2007) ==\n== Third generation XFK (FFK/KFK; 2020) ==`
    expect(headingGenerations(wt, 'Renault Kangoo').map(g => [g.label, g.code, g.yearFrom])).toEqual([
      ['First generation', 'X76', 1997],
      ['Second generation', 'X61', 2007],
      ['Third generation', 'XFK', 2020]
    ])
  })

  it('reads the Audi A6 C-codes and ignores variants', () => {
    const wt = [
      '== C4 (Typ 4A, 1994) ==',
      '=== C4 engines ===',
      '== S6 ==',
      '== C5 (Typ 4B, 1997) ==',
      '== allroad quattro (1999–2005) ==',
      '== C6 (Typ 4F, 2004) ==',
      '== A6L (2005–2009) ==',
      '== S6 (2012–2018) ==',
      '== C7 (Typ 4G, 2011) ==',
      '== C7 facelift (2015–2018) =='
    ].join('\n')
    expect(headingGenerations(wt, 'Audi A6').map(g => [g.code, g.yearFrom])).toEqual([
      ['C4', 1994],
      ['C5', 1997],
      ['C6', 2004],
      ['C7', 2011]
    ])
  })

  it('reads letter generations named after the model (Vectra, Zafira) and skips other brands', () => {
    const vectra = `== Vectra A (1988–1995) ==\n== Vectra B (1995–2002) ==\n== Vectra C (2002–2008) ==\n== Chevrolet Vectra D (2009–2012) ==`
    expect(headingGenerations(vectra, 'Opel Vectra').map(g => [g.code, g.yearFrom])).toEqual([
      ['Vectra A', 1988],
      ['Vectra B', 1995],
      ['Vectra C', 2002]
    ])
    const zafira = `== Zafira A (1999) ==\n== Zafira OPC ==\n== Zafira B (2005) ==\n== Zafira C/Zafira Tourer (2011) ==`
    expect(headingGenerations(zafira, 'Opel Zafira').map(g => [g.code, g.yearFrom])).toEqual([
      ['Zafira A', 1999],
      ['Zafira B', 2005],
      ['Zafira C', 2011]
    ])
  })

  it('finds nothing in a single stray code heading', () => {
    expect(headingGenerations('== S6 (2012–2018) ==', 'Audi A6')).toEqual([])
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

describe('parseTitlePins', () => {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

  it('defaults lang to en and reads a lang column', () => {
    const pins = parseTitlePins('query,title,lang\nVAZ 2101,VAZ-2101\nNeoplan n 116,Neoplan Cityliner,de\n', norm)
    expect(pins.get('vaz2101')).toEqual({ lang: 'en', title: 'VAZ-2101' })
    expect(pins.get('neoplann116')).toEqual({ lang: 'de', title: 'Neoplan Cityliner' })
  })

  it('still reads the two-column form', () => {
    expect(parseTitlePins('query,title\nZil 130,ZIL-130\n', norm).get('zil130')).toEqual({
      lang: 'en',
      title: 'ZIL-130'
    })
  })
})

describe('productionSpan in other editions', () => {
  it('reads the de infobox field', () => {
    expect(
      productionSpan('{{Infobox Bus\n | Marke = Setra\n | Produktionszeitraum = 1991–2002\n | Achsen = 2\n}}')
    ).toEqual({
      from: 1991,
      to: 2002
    })
  })
})
