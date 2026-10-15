import { describe, expect, it } from 'vitest'

import { feedDate, feedVins, toWantedInsert } from './wanted-parse.js'

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
})
