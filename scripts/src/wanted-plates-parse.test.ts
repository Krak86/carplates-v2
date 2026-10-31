import { describe, expect, it } from 'vitest'

import { plateDate, toWantedPlateInsert, WantedPlateFeedRowSchema } from './wanted-plates-parse.js'

const NOW = new Date('2026-10-31T12:00:00Z')

describe('Garpun feed parsing', () => {
  it('normalizes the plate and maps dates, unit and region', () => {
    const row = toWantedPlateInsert(
      {
        id: '3024054597557325',
        vehiclenumber: ' bb 3619 ep ',
        illegalseizuredate: '2022-04-22T09:00:00Z',
        insertdate: '2022-05-16T00:00:00Z',
        organunit: 'ГОЛОВНЕ УПРАВЛІННЯ НАЦІОНАЛЬНОЇ ПОЛІЦІЇ В ЛУГАНСЬКІЙ ОБЛАСТІ '
      },
      NOW
    )
    expect(row).toEqual({
      sourceId: '3024054597557325',
      plate: 'ВВ3619ЕР',
      seizedAt: '2022-04-22',
      insertedAt: '2022-05-16',
      organUnit: 'ГОЛОВНЕ УПРАВЛІННЯ НАЦІОНАЛЬНОЇ ПОЛІЦІЇ В ЛУГАНСЬКІЙ ОБЛАСТІ',
      region: 'Луганська область'
    })
  })

  it('skips records without a plate or an id', () => {
    expect(toWantedPlateInsert({ id: '3281698', vehiclenumber: null }, NOW)).toBeNull()
    expect(toWantedPlateInsert({ id: '1', vehiclenumber: '  ' }, NOW)).toBeNull()
    expect(toWantedPlateInsert({ vehiclenumber: 'АА1234ВВ' }, NOW)).toBeNull()
  })

  it('clamps absurd dates', () => {
    expect(plateDate('1530-01-01T00:00:00Z', NOW)).toBeNull()
    expect(plateDate('1950-06-01T00:00:00Z', NOW)).toBeNull()
    expect(plateDate('0200-03-04T08:00:00Z', NOW)).toBeNull()
    expect(plateDate('2027-01-01T00:00:00Z', NOW)).toBeNull()
    expect(plateDate('1998-05-06T00:00:00Z', NOW)).toBe('1998-05-06')
    expect(plateDate('2026-10-31T09:00:00Z', NOW)).toBe('2026-10-31')
    expect(plateDate(null, NOW)).toBeNull()
  })

  it('keeps a row with a bogus date but a real plate', () => {
    expect(
      toWantedPlateInsert({ id: '2', vehiclenumber: 'АА1234ВВ', illegalseizuredate: '1530-01-01T00:00:00Z' }, NOW)
    ).toMatchObject({
      plate: 'АА1234ВВ',
      seizedAt: null,
      region: null
    })
  })

  it('accepts a numeric id and rejects a wrongly typed field', () => {
    expect(WantedPlateFeedRowSchema.parse({ id: 5, vehiclenumber: 'АА1234ВВ' }).id).toBe('5')
    expect(WantedPlateFeedRowSchema.safeParse({ id: '5', vehiclenumber: 12 }).success).toBe(false)
  })
})
