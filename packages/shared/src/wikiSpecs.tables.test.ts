/// <reference types="node" />
import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import {
  engineTemplates,
  parseEngine,
  parseWikiSpecs,
  parseWikiTables,
  powerKwOf,
  tableSpecs,
  type WikiEngine
} from './wikiSpecs.js'

/** Trimmed real wikitext (lead + headings + the spec tables only), saved from the live articles — never fetched in tests. */
const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/wiki/${name}.wikitext`, import.meta.url), 'utf8')

describe('powerKwOf', () => {
  it('converts by unit and rejects bare numbers', () => {
    expect(powerKwOf('141 kW')).toBe(141)
    expect(powerKwOf('110 PS')).toBe(81)
    expect(powerKwOf('100 hp')).toBe(75)
    expect(powerKwOf('86 л. с.')).toBe(63)
    expect(powerKwOf('5500 rpm')).toBeNull()
  })
})

describe('parseEngine litres', () => {
  it('does not read the tail of a power figure as displacement', () => {
    expect(parseEngine('1,5 (86 л. с.)').displacementCc).toBeNull()
    expect(parseEngine('1,6 литровый').displacementCc).toBe(1600)
  })
})

describe('parseWikiTables', () => {
  const wikitext = `lead
== Powertrain ==
=== Petrol ===
{| class="wikitable"
|+ caption
|-
! Engine !! Power
|-
| style="x" | 1.6 L<br />I4 || {{convert|110|PS|kW|0}}
|-
| rowspan=2 | 2.0 L || 150 hp
|-
| 160 hp
|}
after`

  it('reads header, cells, the heading path and expands rowspans', () => {
    const [t] = parseWikiTables(wikitext)
    expect(t?.headings).toEqual(['Powertrain', 'Petrol'])
    expect(t?.header).toEqual(['Engine', 'Power'])
    expect(t?.rows).toHaveLength(3)
    expect(t?.rows[0]?.[0]).toEqual(['1.6 L', 'I4'])
    expect(t?.rows[2]?.[0]).toEqual(['2.0 L'])
    expect(t?.merged).toBe(true)
  })

  it('does not split cells on pipes inside templates and links', () => {
    const [t] = parseWikiTables('{|\n! A !! B\n|-\n| [[x|1.6 L]] || {{convert|110|PS|kW|0}}\n|}')
    expect(t?.rows[0]).toEqual([['1.6 L'], ['110 PS']])
  })

  it('turns a table into engines and keeps group title rows out', () => {
    const [t] = parseWikiTables(wikitext)
    expect(tableSpecs(t!).engines.map(e => [e.displacementCc, e.powerKw])).toEqual([
      [1600, 81],
      [2000, 112],
      [2000, 119]
    ])
  })
})

describe('Honda Civic (ninth generation), en: the "Powertrain" table', () => {
  const s = parseWikiSpecs(fixture('civic9.en'), { lang: 'en' })

  it('has no infobox figures — the infobox only gives the layout', () => {
    expect(s.layout).not.toBe('')
    expect(s.wheelbaseMm).toBeNull()
    expect(s.lengthMm).toBeNull()
  })

  it('reads all 11 engine rows with power, chassis codes and fuel', () => {
    expect(s.engines).toHaveLength(11)
    expect(s.engines.every(e => e.powerKw !== null && e.displacementCc !== null && e.cylinders === 4)).toBe(true)
    expect(s.engines[0]).toMatchObject({
      displacementCc: 1300,
      powerKw: 75,
      fuel: 'petrol',
      chassisCodes: ['FK1'],
      note: 'Hatchback'
    })
  })

  it('splits multi-code cells and picks fuel from the engine and the chassis note', () => {
    const byCode = (code: string): WikiEngine | undefined => s.engines.find(e => e.chassisCodes?.includes(code))
    expect(byCode('FB7')?.chassisCodes).toEqual(['FB1', 'FB7'])
    expect(byCode('FB4')?.fuel).toBe('hybrid')
    expect(byCode('FB5')?.fuel).toBe('lpg') // "Natural Gas Sedan"
    expect(byCode('FK3')?.fuel).toBe('diesel')
    expect(byCode('FK8')).toBeUndefined()
    expect(byCode('FK2')?.displacementCc).toBe(1800)
  })
})

describe('real articles', () => {
  type Case = {
    file: string
    lang: string
    engines: number
    first: { displacementCc?: number | null; powerKw?: number | null; fuel?: string | null }
    dims?: Partial<Record<'wheelbaseMm' | 'lengthMm' | 'widthMm' | 'heightMm' | 'kerbKg' | 'fuelTankL', number>>
  }
  const cases: Case[] = [
    {
      file: 'civic10.en',
      lang: 'en',
      engines: 8,
      first: { displacementCc: 1500, fuel: 'petrol' },
      dims: { wheelbaseMm: 2700 }
    },
    {
      file: 'camry70.en',
      lang: 'en',
      engines: 8,
      first: { displacementCc: 2000, powerKw: 123, fuel: 'petrol' },
      dims: { wheelbaseMm: 2824, lengthMm: 4895 }
    },
    { file: 'camry70.ru', lang: 'ru', engines: 4, first: { displacementCc: 1800, powerKw: 92 } },
    { file: 'civic8.ru', lang: 'ru', engines: 9, first: { displacementCc: 1339, powerKw: 61, fuel: 'petrol' } },
    { file: 'focus3.ru', lang: 'ru', engines: 11, first: { displacementCc: 1400, powerKw: 55, fuel: 'petrol' } },
    { file: 'golf7.de', lang: 'de', engines: 33, first: { displacementCc: 999, powerKw: 63, fuel: 'petrol' } },
    {
      file: 'golf7.en',
      lang: 'en',
      engines: 26,
      first: { displacementCc: 1197, powerKw: 63 },
      dims: { wheelbaseMm: 2631 }
    },
    {
      file: 'bmw3f30.de',
      lang: 'de',
      engines: 24,
      first: { displacementCc: 1598, powerKw: 100 },
      dims: { wheelbaseMm: 2865 }
    },
    { file: 'lancer.de', lang: 'de', engines: 46, first: { displacementCc: 1183, powerKw: 40, fuel: 'petrol' } },
    {
      file: 'lanos.ru',
      lang: 'ru',
      engines: 8,
      first: { displacementCc: 1299, powerKw: 46 },
      dims: { wheelbaseMm: 2520, lengthMm: 4237, kerbKg: 1096, fuelTankL: 48 }
    },
    {
      file: 'lanos.uk',
      lang: 'uk',
      engines: 9,
      first: { displacementCc: 1299, powerKw: 46 },
      dims: { wheelbaseMm: 2520, fuelTankL: 48 }
    },
    {
      file: 'vaz2107.uk',
      lang: 'uk',
      engines: 7,
      first: { displacementCc: 1294, powerKw: 47, fuel: 'petrol' },
      dims: { wheelbaseMm: 2424, lengthMm: 4145, fuelTankL: 39 }
    },
    { file: 'priora.uk', lang: 'uk', engines: 3, first: { displacementCc: 1598, powerKw: 60, fuel: 'petrol' } },
    { file: 'niva.en', lang: 'en', engines: 10, first: { displacementCc: 1294, powerKw: 44, fuel: 'petrol' } },
    { file: 'mazda6.uk', lang: 'uk', engines: 17, first: { displacementCc: 1798, powerKw: 88 } }
  ]

  it.each(cases)('$file', ({ file, lang, engines, first, dims }) => {
    const s = parseWikiSpecs(fixture(file), { lang })
    expect(s.engines).toHaveLength(engines)
    expect(s.engines[0]).toMatchObject(first)
    for (const [k, v] of Object.entries(dims ?? {})) {
      expect(s[k as keyof typeof dims] as unknown as { value: number } | null).toMatchObject({ value: v })
    }
  })

  it('never invents a figure for ambiguous variants', () => {
    // Niva: wheelbase differs per body (2200 / 2700 mm) → no headline value, raw text kept.
    const s = parseWikiSpecs(fixture('niva.en'), { lang: 'en' })
    expect(s.wheelbaseMm).toBeNull()
    expect(s.rawOnly.wheelbase).toContain('2700')
  })

  it('does not take charging power or battery size as engine power (e-Golf)', () => {
    const s = parseWikiSpecs(fixture('golf7.de'), { lang: 'de' })
    const eGolf = s.engines.filter(e => /e-Golf/.test(e.raw))
    expect(eGolf.length).toBeGreaterThan(0)
    expect(eGolf.every(e => e.powerKw === 85 || e.powerKw === 100)).toBe(true)
  })
})

describe('series articles (one page, several generations)', () => {
  const text = fixture('tucson.en')

  it('uses no table without a generation code', () => {
    expect(parseWikiSpecs(text, { lang: 'en', series: true }).engines).toEqual([])
  })

  it('uses only the tables under the heading that names the code', () => {
    const tl = parseWikiSpecs(text, { lang: 'en', series: true, code: 'TL' })
    const jm = parseWikiSpecs(text, { lang: 'en', series: true, code: 'JM' })
    expect(tl.engines.length).toBeGreaterThan(0)
    expect(jm.engines.length).toBeGreaterThan(0)
    expect(tl.engines.map(e => e.raw)).not.toEqual(jm.engines.map(e => e.raw))
    expect(tl.engines.length + jm.engines.length).toBeLessThan(parseWikiSpecs(text, { lang: 'en' }).engines.length)
  })
})

describe('one infobox per generation with {{Двигатель}} engine templates (ru Mazda6)', () => {
  const text = fixture('mazda6.ru')
  const gen = (yearFrom: number) => parseWikiSpecs(text, { lang: 'ru', code: 'GG1', series: true, yearFrom })

  it('picks the infobox whose production start matches the generation', () => {
    expect(gen(2002).wheelbaseMm?.value).toBe(2675)
    expect(gen(2007).wheelbaseMm).toBeNull()
    expect(gen(2012).wheelbaseMm?.value).toBe(2830)
  })

  it('reads engines from the {{Двигатель}} templates (kW, hp, displacement)', () => {
    const second = gen(2007).engines
    expect(second.length).toBeGreaterThanOrEqual(2)
    expect(second[0]).toMatchObject({ displacementCc: 1800, powerKw: 88, fuel: 'petrol' })
    expect(second[1]).toMatchObject({ displacementCc: 2000, powerKw: 114 })
  })

  it('engineTemplates converts hp when the kW parameter is empty', () => {
    const [e] = engineTemplates(
      '{{Двигатель\n | наименование = 2,2 CD\n | объём = 2200\n | мощность =\n | мощность лс = 136\n | рекомендованное топливо = ДТ\n}}'
    )
    expect(e).toMatchObject({ displacementCc: 2200, powerKw: 100, fuel: 'diesel' })
  })
})
