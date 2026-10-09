import { describe, it, expect } from 'vitest'

import { wikiSearchName } from './wikiAliases.js'

describe('wikiSearchName', () => {
  it('maps VAZ factory indexes to the base model', () => {
    expect(wikiSearchName('ваз', '21104')).toMatchObject({ brand: 'VAZ', model: '2110', leadQuery: 'ВАЗ-2110' })
    expect(wikiSearchName('ваз', '210700-20')?.model).toBe('2107')
    expect(wikiSearchName('ваз', '210994')?.model).toBe('2109')
    expect(wikiSearchName('богдан', '211040')?.model).toBe('2110')
  })

  it('maps Niva / Priora / Kalina to their marketing names', () => {
    expect(wikiSearchName('ваз', '21213')).toMatchObject({ brand: 'Lada', model: 'Niva' })
    expect(wikiSearchName('lada', '212140')?.model).toBe('Niva')
    expect(wikiSearchName('ваз', '217030')?.model).toBe('Priora')
    expect(wikiSearchName('ваз', '111830')?.model).toBe('Kalina')
  })

  it('maps ZAZ indexes', () => {
    expect(wikiSearchName('заз-daewoo', 't13110')?.model).toBe('Sens')
    expect(wikiSearchName('заз', '110307-42')?.model).toBe('Slavuta')
    expect(wikiSearchName('заз', '110206')?.model).toBe('Tavria')
    expect(wikiSearchName('заз', 'lanos')).toBeNull()
  })

  it('maps engine-code names to a class / series', () => {
    expect(wikiSearchName('mercedes-benz', 'e 270 cdi')?.model).toBe('E-Class')
    expect(wikiSearchName('mercedes-benz', 'b 250e')?.model).toBe('B-Class')
    expect(wikiSearchName('bmw', '116 i')?.model).toBe('1 Series')
    expect(wikiSearchName('bmw', 'x5')).toBeNull()
  })

  it('maps GAZ / UAZ / Geely / Mercedes vans and strips engine sizes', () => {
    expect(wikiSearchName('газ', '2705')?.model).toBe('Gazelle')
    expect(wikiSearchName('уаз', '3962')?.model).toBe('452')
    expect(wikiSearchName('geely mr-7151a', 'mr-7151a')).toMatchObject({ brand: 'Geely', model: 'MK' })
    expect(wikiSearchName('mercedes-benz ml 350', 'ml 350')?.model).toBe('M-Class')
    expect(wikiSearchName('mercedes-benz', '313 cdi')?.model).toBe('Sprinter')
    expect(wikiSearchName('toyota corolla 1.33l', 'corolla 1.33l')).toMatchObject({ brand: 'toyota', model: 'corolla' })
    expect(wikiSearchName('fiat', 'nuovo doblo 1.3')?.model).toBe('doblo')
  })

  it('leaves searchable models alone', () => {
    expect(wikiSearchName('toyota', 'camry')).toBeNull()
    expect(wikiSearchName('ваз', 'granta')).toBeNull()
  })
})
