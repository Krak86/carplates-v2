import { describe, expect, it } from 'vitest'

import { buildRadar, buildRadars, sameKind } from './radar'
import type { CompareRow, CompareValue } from './types'

const row = (id: string, a: CompareValue, b: CompareValue): CompareRow => ({
  id,
  group: 'engine',
  labelKey: `l.${id}`,
  values: [a, b],
  valueKind: 'number',
  direction: 'neutral',
  source: 'rdw'
})

describe('buildRadar', () => {
  it('draws only axes both cars have, on fixed absolute scales', () => {
    const radar = buildRadar('performance', [
      row('power', 40, 300),
      row('topSpeed', 140, 300),
      row('powerToWeight', 110, null),
      row('displacement', 600, 5000)
    ])
    expect(radar.mode).toBe('radar')
    expect(radar.axes.map(a => a.row.id)).toEqual(['power', 'topSpeed', 'displacement'])
    expect(radar.axes[0]).toMatchObject({ a: 0, b: 1, rawA: 40, rawB: 300 })
  })

  it('flips axes where less is better so further out is always better', () => {
    const radar = buildRadar('economy', [
      row('co2', 0, 300),
      row('consumption', 3, 14),
      row('valueEstimate', 2000, 60000)
    ])
    expect(radar.axes.map(a => [a.a, a.b])).toEqual([
      [1, 0],
      [1, 0],
      [1, 0]
    ])
  })

  it('clamps an outlier to the rim', () => {
    const radar = buildRadar('safety', [row('ncapAdult', 150, 0), row('ncapChild', 50, 50), row('ncapVru', 1, 2)])
    expect(radar.axes[0]).toMatchObject({ a: 1, b: 0 })
  })

  it('falls back to bars under three common axes, and to nothing with none', () => {
    expect(buildRadar('safety', [row('ncapAdult', 80, 90), row('ncapChild', 70, 75)]).mode).toBe('bars')
    expect(buildRadar('safety', [row('ncapAdult', 80, null)]).mode).toBe('none')
  })
})

describe('buildRadars', () => {
  it('drops the radars with nothing in common', () => {
    const radars = buildRadars([row('ncapAdult', 80, 90)])
    expect(radars.map(r => r.id)).toEqual(['safety'])
  })
})

describe('sameKind', () => {
  it('compares kinds, ignoring case; an unknown kind never blocks', () => {
    expect(sameKind('Легковий', 'легковий')).toBe(true)
    expect(sameKind('Легковий', 'Мотоцикл')).toBe(false)
    expect(sameKind(null, 'Мотоцикл')).toBe(true)
  })
})
