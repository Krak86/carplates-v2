import { describe, expect, it } from 'vitest'

import { mapRiaCheck, upstreamRiaSchema } from './ria-parse.js'

const HUMMER = {
  auto: { year: 2008, vin: '5GTEN13E688132383' },
  verifyings: {
    infotech: {
      title: 'Hummer H3 2008',
      vin: 'VIN-код 5GTEN13E688132383',
      engine: 'Бензин, 3.7 л',
      lastOperation: 'Остання операція 21.04.2012 • Реєстрацiя ТЗ придбаного на аукціоні товар. бiржi',
      color: 'Білий',
      ownersCount: '1 власник'
    }
  }
}

describe('mapRiaCheck', () => {
  it('maps the free infotech block of a pre-2013 plate', () => {
    expect(mapRiaCheck('АА8193НР', upstreamRiaSchema.parse(HUMMER))).toEqual({
      plate: 'АА8193НР',
      vin: '5GTEN13E688132383',
      title: 'Hummer H3 2008',
      year: 2008,
      engine: 'Бензин, 3.7 л',
      color: 'Білий',
      ownersCount: 1,
      lastOperationDate: '2012-04-21',
      lastOperationName: 'Реєстрацiя ТЗ придбаного на аукціоні товар. бiржi',
      sourceUrl: 'https://auto.ria.com/uk/check-car/'
    })
  })

  it('reads plural owner wording and tolerates a missing operation', () => {
    const payload = upstreamRiaSchema.parse({
      verifyings: { infotech: { vin: 'VIN-код abc', ownersCount: '2 власники', lastOperation: 'невідомо' } }
    })
    expect(mapRiaCheck('КА1234АВ', payload)).toMatchObject({
      vin: 'ABC',
      ownersCount: 2,
      lastOperationDate: null,
      lastOperationName: null
    })
  })

  it('is null without an infotech block', () => {
    expect(mapRiaCheck('КА1234АВ', upstreamRiaSchema.parse({ auto: { year: 2020 } }))).toBeNull()
  })
})
