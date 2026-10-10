import { describe, it, expect } from 'vitest'

import {
  addTcRow,
  addUsLine,
  alnum,
  cleanComment,
  groupUsByMake,
  hasUsTwin,
  toSnapshot,
  type CaCampaign,
  type UsCampaign
} from './ca-recalls-parse.js'

const tcRow = (over: Record<string, string>): Record<string, string> => ({
  RECALL_NUMBER_NUM: '2019090',
  YEAR: '2018.0',
  MANUFACTURER_RECALL_NO_TXT: 'PC680',
  CATEGORY_ETXT: 'SUV',
  MAKE_NAME_NM: 'NISSAN',
  MODEL_NAME_NM: 'QASHQAI',
  UNIT_AFFECTED_NBR: '1200.0',
  SYSTEM_TYPE_ETXT: 'Brakes',
  NOTIFICATION_TYPE_ETXT: 'Safety TC',
  COMMENT_ETXT: 'Issue: \r\nA fault.\r\n\r\n\r\nSafety Risk: \r\nBad.',
  RECALL_DATE_DTE: '2019-02-26',
  ...over
})

const usLine = (id: string, make: string, model: string, mfr: string, date: string): string => {
  const cols = Array.from({ length: 20 }, () => '')
  cols[0] = '1'
  cols[1] = id
  cols[2] = make
  cols[3] = model
  cols[4] = '2018'
  cols[5] = mfr
  cols[15] = date
  return cols.join('\t')
}

const campaign = (over: Partial<Record<string, string>> = {}): CaCampaign => {
  const acc = new Map<string, CaCampaign>()
  addTcRow(acc, tcRow(over as Record<string, string>))
  return [...acc.values()][0]!
}

const usIndex = (...lines: string[]): ReadonlyMap<string, UsCampaign[]> => {
  const acc = new Map<string, UsCampaign>()
  for (const l of lines) addUsLine(acc, l)
  return groupUsByMake(acc.values())
}

describe('cleanComment', () => {
  it('normalizes line breaks and blank runs', () => {
    expect(cleanComment('Issue: \r\nA fault.\r\n\r\n\r\nRisk: \r\nBad.')).toBe('Issue:\nA fault.\n\nRisk:\nBad.')
    expect(cleanComment('  ')).toBeNull()
  })
})

describe('addTcRow', () => {
  it('folds the model-year rows of one recall into one campaign', () => {
    const acc = new Map<string, CaCampaign>()
    addTcRow(acc, tcRow({ YEAR: '2017.0' }))
    addTcRow(acc, tcRow({ YEAR: '2018.0' }))
    addTcRow(acc, tcRow({ YEAR: '2018.0', MODEL_NAME_NM: 'X-TRAIL' }))
    expect(acc.size).toBe(1)
    const c = acc.get('2019090')!
    expect(c.models.size).toBe(3)
    expect(c.units).toBe(1200)
    expect(c.comment).toBe('Issue:\nA fault.\n\nSafety Risk:\nBad.')
  })

  it('skips compliance notices, old recalls and rows without a number', () => {
    const acc = new Map<string, CaCampaign>()
    addTcRow(acc, tcRow({ NOTIFICATION_TYPE_ETXT: 'Compliance Mfr' }))
    addTcRow(acc, tcRow({ NOTIFICATION_TYPE_ETXT: 'Inconsequential' }))
    addTcRow(acc, tcRow({ RECALL_DATE_DTE: '2009-12-31' }))
    addTcRow(acc, tcRow({ RECALL_NUMBER_NUM: '' }))
    expect(acc.size).toBe(0)
  })

  it('records an unknown model year as 0', () => {
    expect([...campaign({ YEAR: '' }).models.values()][0]!.year).toBe(0)
  })
})

describe('hasUsTwin', () => {
  it('finds the same manufacturer campaign number of the same make', () => {
    const us = usIndex(usLine('19V111000', 'NISSAN', 'ROGUE', 'PC680', '20190401'))
    expect(hasUsTwin(campaign(), us)).toBe(true)
  })

  it('finds the same make + model close in time', () => {
    const us = usIndex(usLine('19V111000', 'NISSAN', 'QASHQAI SPORT', 'XX1', '20190601'))
    expect(hasUsTwin(campaign({ MANUFACTURER_RECALL_NO_TXT: '' }), us)).toBe(true)
  })

  it('does not match another make, another model, or a distant date', () => {
    expect(hasUsTwin(campaign(), usIndex(usLine('1', 'TOYOTA', 'QASHQAI', 'PC680', '20190401')))).toBe(false)
    expect(hasUsTwin(campaign(), usIndex(usLine('1', 'NISSAN', 'ROGUE', 'ZZ', '20190401')))).toBe(false)
    expect(hasUsTwin(campaign(), usIndex(usLine('1', 'NISSAN', 'QASHQAI', 'ZZ', '20200901')))).toBe(false)
  })

  it('does not call an old campaign with a reused number a twin', () => {
    const us = usIndex(usLine('1', 'NISSAN', 'ROGUE', 'PC680', '20120101'))
    expect(hasUsTwin(campaign(), us)).toBe(false)
  })
})

describe('toSnapshot', () => {
  it('writes one row per campaign and one link per make / model / year with our keys', () => {
    const acc = new Map<string, CaCampaign>()
    addTcRow(acc, tcRow({ YEAR: '2017.0' }))
    addTcRow(acc, tcRow({ YEAR: '2018.0' }))
    const { recalls, models } = toSnapshot(acc.values())
    expect(recalls).toHaveLength(1)
    expect(recalls[0]).toMatchObject({ recallNumber: '2019090', system: 'Brakes', units: 1200 })
    expect(models.map(m => [m.makeKey, m.modelKey, m.modelYear])).toEqual([
      ['nissan', 'qashqai', 2017],
      ['nissan', 'qashqai', 2018]
    ])
  })
})

describe('alnum', () => {
  it('keeps upper-case letters and digits only', () => {
    expect(alnum('Mercedes-Benz E 200')).toBe('MERCEDESBENZE200')
  })
})
