import { describe, expect, it } from 'vitest'
import type { MotResponse } from '@carplates/shared'

import { barHeight, failCurve, groupsAtBand, topFaultGroups } from '@/routes/read/recalls/helpers'

type Match = NonNullable<MotResponse['match']>

const match = {
  tests: 1000,
  bands: [
    { tests: 500, failRate: 0.1, watchRate: 0.2, baselineFailRate: 0.12 },
    { tests: 10, failRate: null, watchRate: null, baselineFailRate: 0.3 }
  ],
  groups: [
    { code: 'tyres', fail: [], watch: [], failTests: 50, watchTests: 100 },
    { code: 'brakes', fail: [], watch: [], failTests: 200, watchTests: 300 }
  ]
} as unknown as Match

describe('failCurve', () => {
  it('keeps band order and nulls for thin bands', () => {
    expect(failCurve(match).map(p => [p.band, p.failRate, p.baselineFailRate])).toEqual([
      [0, 0.1, 0.12],
      [1, null, 0.3]
    ])
  })
})

describe('topFaultGroups', () => {
  it('orders by failed tests and turns counts into shares of all tests', () => {
    expect(topFaultGroups(match, 1)).toEqual([{ code: 'brakes', failShare: 0.2, watchShare: 0.3 }])
  })

  it('is empty without tests', () => {
    expect(topFaultGroups({ ...match, tests: 0 }, 3)).toEqual([])
  })
})

describe('barHeight', () => {
  it('scales against the top and keeps a sliver', () => {
    expect(barHeight(0.1, 0.2)).toBe(50)
    expect(barHeight(0.0001, 0.2)).toBe(2)
    expect(barHeight(null, 0.2)).toBe(0)
  })
})

describe('groupsAtBand', () => {
  const banded = {
    groups: [
      { code: 'tyres', fail: [0.05, 0.1], watch: [0.2, null] },
      { code: 'brakes', fail: [0.04, null], watch: [0.1, 0.3] },
      { code: 'lamps', fail: [0.01, 0.2], watch: [0, 0] }
    ]
  } as unknown as Match

  it('orders by the fail share of the band, skips groups with no figure and caps the list', () => {
    expect(groupsAtBand(banded, 1, 5).map(g => g.code)).toEqual(['lamps', 'tyres'])
    expect(groupsAtBand(banded, 0, 1)).toEqual([{ code: 'tyres', fail: 0.05, watch: 0.2 }])
  })
})
