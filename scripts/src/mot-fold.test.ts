import { describe, it, expect } from 'vitest'

import { type Census, foldCensus, KeyCache } from './mot-aggregate.js'
import { MotFold, baseModelName } from './mot-fold.js'

const real = new Set([
  'car|ford|kuga',
  'car|ford|transit',
  'car|ford|transitconnect',
  'car|landrover|rangerover',
  'car|landrover|rangeroversport',
  'car|bmw|x5',
  'car|hyundai|ioniq',
  'car|viva|viva',
  'car|vauxhall|viva',
  'car|vauxhall|vivaro'
])
const fold = new MotFold(real, new Set(['car|hyundai|ioniq5']))

describe('MotFold', () => {
  it('folds a trim into its base model', () => {
    expect(fold.fold('car', 'ford', 'kugastlinexedphevcvt', 'KUGA ST-LINE X ED PHEV CVT')).toBe('kuga')
    expect(fold.fold('car', 'bmw', 'x5mcompetitionauto', 'X5 M COMPETITION AUTO')).toBe('x5')
  })

  it('never folds a real model into its parent', () => {
    expect(fold.fold('car', 'ford', 'transitconnect', 'TRANSIT CONNECT')).toBe('transitconnect')
    expect(fold.fold('car', 'landrover', 'rangeroversport', 'RANGE ROVER SPORT')).toBe('rangeroversport')
  })

  it('takes the longest real word prefix', () => {
    expect(fold.fold('car', 'ford', 'transitconnectlwb', 'TRANSIT CONNECT LWB')).toBe('transitconnect')
    expect(fold.fold('car', 'landrover', 'rangeroversporthsedauto', 'RANGE ROVER SPORT HSE D AUTO')).toBe(
      'rangeroversport'
    )
    expect(fold.fold('car', 'landrover', 'rangeroverhsedauto', 'RANGE ROVER HSE D AUTO')).toBe('rangerover')
  })

  it('matches whole words only', () => {
    expect(fold.fold('car', 'vauxhall', 'vivarosportive', 'VIVARO SPORTIVE')).toBe('vivaro')
    expect(fold.fold('car', 'vauxhall', 'vivarox', 'VIVAROX')).toBe('vivarox')
  })

  it('keeps a kept-separate model apart and folds its trims into it', () => {
    expect(fold.fold('car', 'hyundai', 'ioniq5', 'IONIQ 5')).toBe('ioniq5')
    expect(fold.fold('car', 'hyundai', 'ioniq5premiumev', 'IONIQ 5 PREMIUM EV')).toBe('ioniq5')
    expect(fold.fold('car', 'hyundai', 'ioniqseconnecthev', 'IONIQ SE CONNECT HEV')).toBe('ioniq')
  })

  it('does not cross kind or make', () => {
    expect(fold.fold('van', 'ford', 'kugast', 'KUGA ST')).toBe('kugast')
    expect(fold.fold('car', 'kia', 'kugast', 'KUGA ST')).toBe('kugast')
  })

  it('leaves a single-word unknown model alone', () => {
    expect(fold.fold('car', 'ford', 'ka', 'KA')).toBe('ka')
  })
})

describe('KeyCache', () => {
  it('keys a row under its folded model', () => {
    expect(new KeyCache(fold).get('car', 'FORD', 'KUGA ST-LINE')).toEqual({ mk: 'ford', mo: 'kuga' })
  })
})

describe('foldCensus', () => {
  it('sums trims onto the base and keeps the base spelling', () => {
    const rec = (model: string, tests: number): Census[string] => ({
      make: 'FORD',
      model,
      tests,
      spellings: { [`FORD|${model}`]: tests }
    })
    const out = foldCensus(
      {
        'car|ford|kuga': rec('KUGA', 1000),
        'car|ford|kugastline': rec('KUGA ST-LINE', 150),
        'car|ford|transitconnect': rec('TRANSIT CONNECT', 500)
      },
      fold
    )
    expect(Object.keys(out).sort()).toEqual(['car|ford|kuga', 'car|ford|transitconnect'])
    expect(out['car|ford|kuga']).toMatchObject({ model: 'KUGA', tests: 1150 })
    expect(foldCensus(out, fold)).toEqual(out)
  })
})

describe('baseModelName', () => {
  it('cuts the trim words off a folded key name', () => {
    expect(baseModelName('IONIQ 5 PREMIUM EV', 'ioniq5')).toBe('IONIQ 5')
    expect(baseModelName('KUGA', 'kuga')).toBe('KUGA')
    expect(baseModelName('X5 M', 'x5m')).toBe('X5 M')
  })
})
