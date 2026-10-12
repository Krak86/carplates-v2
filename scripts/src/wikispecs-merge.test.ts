import { describe, it, expect } from 'vitest'
import type { WikiSpecs } from '@carplates/shared'

import { mergeEditions, wikiLangChain, type Edition } from './wikispecs-merge.js'

const measure = (value: number) => ({ value, min: value, max: value })
const empty = (): WikiSpecs => ({
  wheelbaseMm: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  kerbKg: null,
  fuelTankL: null,
  layout: '',
  transmission: '',
  engines: [],
  rawOnly: {}
})
const ed = (lang: string, specs: Partial<WikiSpecs>): Edition => ({
  lang,
  title: `${lang}-title`,
  revid: 7,
  specs: { ...empty(), ...specs }
})
const KEY = { makeKey: 'honda', modelKey: 'civic', yearFrom: 2011, wikidataId: 'Q1' }
const ENGINE = { displacementCc: 1800, cylinders: 4, powerKw: 104, fuel: 'petrol' as const, raw: '1.8 L' }

describe('wikiLangChain', () => {
  it('puts en first, adds de for every make and the home edition last', () => {
    expect(wikiLangChain('honda')).toEqual(['en', 'ru', 'uk', 'de', 'ja'])
    expect(wikiLangChain('lada')).toEqual(['en', 'ru', 'uk', 'de'])
    expect(wikiLangChain('volkswagen')).toEqual(['en', 'ru', 'uk', 'de'])
  })
})

describe('mergeEditions', () => {
  it('takes each block from one edition: dimensions from the fullest, engines with power, drive from any', () => {
    const row = mergeEditions(
      KEY,
      [
        ed('en', { layout: 'FF', engines: [{ ...ENGINE, powerKw: null, raw: 'x' }] }),
        ed('ru', { lengthMm: measure(4300.4), widthMm: measure(1770), kerbKg: measure(1250), engines: [ENGINE] }),
        ed('de', { lengthMm: measure(4301) })
      ],
      false
    )
    expect(row).toMatchObject({
      lengthMm: 4300,
      widthMm: 1770,
      kerbKg: 1250,
      srcLang: 'ru',
      revid: 7,
      enginesLang: 'ru',
      layout: 'FF',
      driveLang: 'en'
    })
    expect(row?.engines).toHaveLength(1)
  })

  it('drops the dimension block when RDW has the model but keeps engines and drive', () => {
    const row = mergeEditions(KEY, [ed('en', { lengthMm: measure(4300), layout: 'FF', engines: [ENGINE] })], true)
    expect(row).toMatchObject({
      lengthMm: null,
      srcLang: '',
      srcTitle: '',
      revid: null,
      layout: 'FF',
      enginesLang: 'en'
    })
  })

  it('returns null when no edition has anything', () => {
    expect(mergeEditions(KEY, [ed('en', {}), ed('ru', {})], false)).toBeNull()
    expect(mergeEditions(KEY, [ed('en', { lengthMm: measure(4300) })], true)).toBeNull()
  })

  it('passes engineCodes through, an empty list included (the "header named the column" marker)', () => {
    const named = { ...ENGINE, chassisCodes: ['FK1'], engineCodes: [] }
    const ambiguous = { ...ENGINE, chassisCodes: ['K9K'] }
    const row = mergeEditions(KEY, [ed('en', { engines: [{ ...named, engineCodes: ['B48'] }] })], false)
    expect(row?.engines?.[0]).toMatchObject({ chassisCodes: ['FK1'], engineCodes: ['B48'] })
    expect(mergeEditions(KEY, [ed('en', { engines: [named] })], false)?.engines?.[0]?.engineCodes).toEqual([])
    expect(mergeEditions(KEY, [ed('en', { engines: [ambiguous] })], false)?.engines?.[0]).not.toHaveProperty(
      'engineCodes'
    )
  })

  it('falls back to a power-less engine list only when no edition has power', () => {
    const noPower = { ...ENGINE, powerKw: null }
    expect(mergeEditions(KEY, [ed('en', { engines: [noPower] })], false)?.enginesLang).toBe('en')
    expect(
      mergeEditions(KEY, [ed('en', { engines: [noPower, noPower] }), ed('uk', { engines: [ENGINE] })], false)
        ?.enginesLang
    ).toBe('uk')
  })
})
