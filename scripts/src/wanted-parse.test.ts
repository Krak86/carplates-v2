import { describe, expect, it } from 'vitest'

import { feedDate, feedVins, organUnitRegion, toWantedInsert } from './wanted-parse.js'

describe('wanted feed parsing', () => {
  it('collects the VIN-shaped body and chassis numbers', () => {
    expect(feedVins({ bodynumber: 'xta211440a4913850' })).toEqual(['XTA211440A4913850'])
    expect(feedVins({ bodynumber: '10291075', chassisnumber: 'KNEJC524575729035' })).toEqual(['KNEJC524575729035'])
    expect(feedVins({ bodynumber: 'Y6LJC52457L000817', chassisnumber: 'KNEJC524575729035' })).toEqual([
      'Y6LJC52457L000817',
      'KNEJC524575729035'
    ])
    expect(feedVins({ bodynumber: 'XTA211440A4913850', chassisnumber: 'XTA211440A4913850' })).toHaveLength(1)
    expect(feedVins({ bodynumber: '10291075', chassisnumber: null })).toEqual([])
    expect(feedVins({ chassisnumber: ' KNEJC524575 729035 ' })).toEqual(['KNEJC524575729035'])
  })

  it('normalizes the plate and drops empty strings', () => {
    const row = toWantedInsert({ id: '1', vehiclenumber: 'bi 3903 eb', brand: ' ВАЗ ', color: '' })
    expect(row).toMatchObject({ sourceId: '1', plate: 'ВІ3903ЕВ', brand: 'ВАЗ', color: null, vin: null, vinAlt: null })
  })

  it('skips records without an id', () => {
    expect(toWantedInsert({ vehiclenumber: 'АА1234ВВ' })).toBeNull()
  })

  it('keeps the date part and rejects placeholder years', () => {
    expect(feedDate('2022-08-05T15:00:00Z')).toBe('2022-08-05')
    expect(feedDate('0200-03-04T08:00:00Z')).toBeNull()
    expect(feedDate(null)).toBeNull()
  })

  it('derives the region from the police unit (the oblast named last wins)', () => {
    const cases: [string, string][] = [
      ['ДАРНИЦЬКЕ УПРАВЛІННЯ ПОЛІЦІЇ ГУНП В М. КИЄВІ', 'Київ'],
      [
        'ВІДДІЛ ПОЛІЦІЇ №2 (М.ІРПІНЬ) БУЧАНСЬКОГО РАЙОННОГО УПРАВЛІННЯ ПОЛІЦІЇ ГУНП В КИЇВСЬКІЙ ОБЛ.',
        'Київська область'
      ],
      ['КОМУНАРСЬКЕ ВІДДІЛЕННЯ ПОЛІЦІЇ ДНІПРОВСЬКОГО ВІДДІЛУ ГУНП В ЗАПОРІЗЬКІЙ ОБЛАСТІ', 'Запорізька область'],
      ['КИЇВСЬКЕ ВІДДІЛЕННЯ ПОЛІЦІЇ ГУНП В ОДЕСЬКІЙ ОБЛАСТІ', 'Одеська область'],
      ['ОМ 1 Г.ЯЛТЫ АР КРЫМ', 'АР Крим'],
      ['БАЛАКЛАВСЬКИЙ РВ СЕВАСТПОЛЬСЬКОГО МУ', 'Севастополь'],
      ['УСБУ В ХАРКІВЬКІЙ ОБЛАСТІ', 'Харківська область']
    ]
    for (const [unit, region] of cases) expect(organUnitRegion(unit)).toBe(region)
    expect(organUnitRegion('НАЦІОНАЛЬНА ПОЛІЦІЯ УКРАЇНИ')).toBeNull()
    expect(organUnitRegion(null)).toBeNull()
  })
})
