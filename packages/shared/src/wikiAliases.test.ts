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
    expect(wikiSearchName('bmw', 'r 1200gs')).toMatchObject({ model: 'R1200GS', leadQuery: 'BMW R1200GS' })
    expect(wikiSearchName('bmw', 'r 1200 gs')?.model).toBe('R1200GS')
    expect(wikiSearchName('bmw', 'f 700gs')?.leadQuery).toBe('BMW F series parallel-twin')
    expect(wikiSearchName('bmw', 'f 800r')?.model).toBe('F series')
  })

  it('maps GAZ / UAZ / Geely / Mercedes vans and strips engine sizes', () => {
    expect(wikiSearchName('газ', '2705')?.model).toBe('Gazelle')
    expect(wikiSearchName('уаз', '3962')?.model).toBe('452')
    expect(wikiSearchName('geely mr-7151a', 'mr-7151a')).toMatchObject({ brand: 'Geely', model: 'MK' })
    expect(wikiSearchName('mercedes-benz ml 350', 'ml 350')?.model).toBe('M-Class')
    expect(wikiSearchName('mercedes-benz', '313 cdi')?.model).toBe('Sprinter')
    expect(wikiSearchName('toyota corolla 1.33l', 'corolla 1.33l')).toMatchObject({ brand: 'toyota', model: 'corolla' })
    expect(wikiSearchName('fiat', 'nuovo doblo 1.3')?.model).toBe('Doblo')
  })

  it('drops a model repeated in the brand, and maps the not_found tail', () => {
    expect(wikiSearchName('seat leon', 'leon')).toMatchObject({ brand: 'seat', model: 'leon' })
    expect(wikiSearchName('daewoo sens t1311', 'sens t1311')?.model).toBe('Sens')
    expect(wikiSearchName('geely', 'fe-1')?.model).toBe('LC')
    expect(wikiSearchName('geely mk jl7152', 'mk jl7152')?.model).toBe('MK')
    expect(wikiSearchName('уаз', '31514')?.model).toBe('469')
    expect(wikiSearchName('газ', '32213')?.model).toBe('Gazelle')
    expect(wikiSearchName('ваз', '219010')?.model).toBe('Granta')
    expect(wikiSearchName('mercedes-benz', '230 е')?.model).toBe('E-Class')
    expect(wikiSearchName('mercedes-benz', 'vito 112cdi')?.model).toBe('Vito')
    expect(wikiSearchName('mercedes-benz', '208 d')?.model).toBe('T1')
    expect(wikiSearchName('mercedes-benz', 'g 55 amg')?.model).toBe('G-Class')
    expect(wikiSearchName('bmw', '330е')?.model).toBe('3 Series')
    expect(wikiSearchName('infiniti', 'qx56')?.model).toBe('QX')
    expect(wikiSearchName('geely fc mr-7180', 'fc mr-7180')?.model).toBe('FC')
    expect(wikiSearchName('geely', 'lc-1a')?.model).toBe('LC')
    expect(wikiSearchName('fiat nuovo doblo', 'nuovo doblo')?.model).toBe('Doblo')
    expect(wikiSearchName('fiat', 'doblo panorama')?.model).toBe('Doblo')
    expect(wikiSearchName('kia', 'sorento jc 5248')?.model).toBe('Sorento')
    expect(wikiSearchName('mitsubishi l 400', 'l 400')?.model).toBe('L400')
    expect(wikiSearchName('mitsubishi', 'speace star')?.model).toBe('Space Star')
    expect(wikiSearchName('mitsubishi', 'pajero wgn 3.2 did')?.model).toBe('Pajero')
    expect(wikiSearchName('peugeot', 'expert traveller')?.model).toBe('Expert')
    expect(wikiSearchName('peugeot 307 xs 2.0 e', '307 xs 2.0 e')?.model).toBe('307')
    expect(wikiSearchName('land rover', 'range rover')).toBeNull()
  })

  it('leaves searchable models alone', () => {
    expect(wikiSearchName('toyota', 'camry')).toBeNull()
    expect(wikiSearchName('ваз', 'granta')).toBeNull()
  })
})
