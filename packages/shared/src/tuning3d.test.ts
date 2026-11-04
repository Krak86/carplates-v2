import { describe, expect, it } from 'vitest'

import {
  buildTuningIndex,
  matchTuning,
  pageBodyFamily,
  parseTuningPage,
  registryBodyFamilies,
  tuningUrl
} from './tuning3d.js'

const BASE = 'https://www.3dtuning.com/en-US/tuning'
const pages = [
  `${BASE}/bmw/3.series/sedan-e90.2005`,
  `${BASE}/bmw/3.series/wagon-e91.2005`,
  `${BASE}/bmw/3.series/sedan-f30.2012`,
  `${BASE}/volkswagen/golf.7/3.door.hatchback-mk7.2013`,
  `${BASE}/volkswagen/golf.7/5.door.hatchback-mk7.2013`,
  `${BASE}/mazda/3/sedan.2019`,
  `${BASE}/mercedes/e.class/sedan-w211.2002`,
  `${BASE}/ford/mustang/2.door.coupe.2024`
].map(u => parseTuningPage(u)!)
const index = buildTuningIndex(pages)

describe('parseTuningPage', () => {
  it('splits body, generation and start year', () => {
    expect(parseTuningPage(`${BASE}/bmw/3.series/sedan-e90.2005`)).toEqual({
      makeSlug: 'bmw',
      modelSlug: '3.series',
      body: 'sedan',
      generation: 'e90',
      startYear: 2005,
      path: 'tuning/bmw/3.series/sedan-e90.2005'
    })
  })
  it('allows a page without a generation', () => {
    const p = parseTuningPage('/en-US/tuning/toyota/4runner/3.door.suv.1984')
    expect(p).toMatchObject({ body: '3.door.suv', generation: '', startYear: 1984 })
  })
  it('rejects user build pages and other shapes', () => {
    expect(parseTuningPage('https://www.3dtuning.com/en-US/someuser/build-1')).toBeNull()
    expect(parseTuningPage('/en-US/tuning/bmw/3.series')).toBeNull()
    expect(parseTuningPage('/en-US/tuning/bmw/3.series/sedan-e90')).toBeNull()
  })
})

describe('matchTuning', () => {
  it('picks the generation with the largest start year not after the car year', () => {
    const m = matchTuning(index, { make: 'bmw', models: ['3series', '3 Series'], year: 2014, body: 'СЕДАН-B' })
    expect(m).toMatchObject({ kind: 'unique', page: { path: 'tuning/bmw/3.series/sedan-f30.2012' } })
  })
  it('keeps body classes apart', () => {
    const m = matchTuning(index, { make: 'bmw', models: ['3series'], year: 2006, body: 'КОМБІ' })
    expect(m).toMatchObject({ kind: 'unique', page: { path: 'tuning/bmw/3.series/wagon-e91.2005' } })
    expect(matchTuning(index, { make: 'bmw', models: ['3series'], year: 2006, body: 'СЕДАН' })).toMatchObject({
      kind: 'unique',
      page: { path: 'tuning/bmw/3.series/sedan-e90.2005' }
    })
  })
  it('refuses a body whose page is older than a newer generation of the model', () => {
    expect(matchTuning(index, { make: 'bmw', models: ['3series'], year: 2014, body: 'КОМБІ' })).toEqual({
      kind: 'none',
      reason: 'stale'
    })
  })
  it('needs a known body unless the model has a single body class', () => {
    expect(matchTuning(index, { make: 'bmw', models: ['3series'], year: 2014 })).toEqual({
      kind: 'none',
      reason: 'body'
    })
    expect(matchTuning(index, { make: 'mazda', models: ['mazda3'], year: 2020 }).kind).toBe('unique')
    expect(matchTuning(index, { make: 'bmw', models: ['3series'], year: 2014, body: 'ПР-БОРТОВИЙ' })).toEqual({
      kind: 'none',
      reason: 'body'
    })
  })
  it('gives no link when no page of the car body class exists', () => {
    expect(matchTuning(index, { make: 'mazda', models: ['mazda3'], year: 2020, body: 'ХЕТЧБЕК' })).toEqual({
      kind: 'none',
      reason: 'body'
    })
  })
  it('treats several doors of one generation as the same car', () => {
    const m = matchTuning(index, { make: 'volkswagen', models: ['golf7'], year: 2015, body: 'ХЕТЧБЕК-В' })
    expect(m.kind).toBe('same-generation')
    expect(matchTuning(index, { make: 'volkswagen', models: ['golf'], year: 2015, body: 'ХЕТЧБЕК' }).kind).toBe('none')
  })
  it('applies make aliases and drops our make prefix from the model', () => {
    expect(matchTuning(index, { make: 'mercedes-benz', models: ['eclass'], year: 2003, body: 'СЕДАН' }).kind).toBe(
      'unique'
    )
    expect(matchTuning(index, { make: 'mazda', models: ['mazda3'], year: 2020, body: 'СЕДАН' }).kind).toBe('unique')
  })
  it('gives no link without a confident match', () => {
    const q = { make: 'bmw', models: ['3series'], body: 'СЕДАН' }
    expect(matchTuning(index, { ...q, year: 1999 })).toEqual({ kind: 'none', reason: 'year-before' })
    expect(matchTuning(index, { ...q, year: 2040 })).toEqual({ kind: 'none', reason: 'year-gap' })
    expect(matchTuning(index, { ...q, models: ['x9'], year: 2010 })).toEqual({ kind: 'none', reason: 'model' })
    expect(matchTuning(index, { ...q, make: 'skoda', year: 2010 })).toEqual({ kind: 'none', reason: 'make' })
    expect(matchTuning(index, { ...q, year: null })).toEqual({ kind: 'none', reason: 'year-unknown' })
  })
})

describe('body families', () => {
  it('maps registry and page bodies', () => {
    expect(registryBodyFamilies('СЕДАН-B')).toEqual(['sedan'])
    expect(registryBodyFamilies('УНІВЕРСАЛ-B')).toContain('suv')
    expect(registryBodyFamilies('ПР-БОРТОВИЙ')).toBeNull()
    expect(pageBodyFamily('5.door.hatchback')).toBe('hatchback')
    expect(pageBodyFamily('station.wagon')).toBe('wagon')
    expect(pageBodyFamily('5')).toBeNull()
  })
})

describe('tuningUrl', () => {
  it('adds the locale', () => {
    expect(tuningUrl({ path: 'tuning/a/b/c.2000' }, 'ru-RU')).toBe('https://www.3dtuning.com/ru-RU/tuning/a/b/c.2000')
  })
})
