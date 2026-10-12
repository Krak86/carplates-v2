import { describe, expect, it } from 'vitest'

import { type MotFamilyKey, commonModelName, mergeIssueRows, motFamilyOf } from './mot-family.js'

const k = (modelKey: string, model: string, tests = 100, makeKey = 'kia', kind = 'car'): MotFamilyKey => ({
  kind,
  makeKey,
  modelKey,
  model,
  tests
})

describe('motFamilyOf', () => {
  const models = [k('ev6gtline', 'EV6 GT-LINE'), k('ev6air', 'EV6 AIR'), k('ev6', 'EV6', 5, 'x'), k('niro', 'NIRO')]

  it('takes every trim key of the same make for a prefix match', () => {
    const family = motFamilyOf(models, models[0]!, 'ev6')
    expect(family.map(m => m.modelKey)).toEqual(['ev6gtline', 'ev6air'])
  })

  it('keeps only the matched key when it is not a forward prefix match', () => {
    expect(motFamilyOf(models, models[3]!, 'niroplus')).toEqual([models[3]])
  })

  it('does not let a name ending in a digit take a longer number', () => {
    const rows = [k('ix3msport', 'IX3 M SPORT', 1, 'bmw'), k('ix35', 'IX35', 1, 'bmw')]
    expect(motFamilyOf(rows, rows[0]!, 'ix3').map(m => m.modelKey)).toEqual(['ix3msport'])
  })
})

describe('commonModelName', () => {
  it('keeps the shared leading words', () => {
    expect(commonModelName(['EV6 GT-LINE', 'EV6 AIR'])).toBe('EV6')
    expect(commonModelName(['C5 AIRCROSS SHINE', 'C5 AIRCROSS FEEL'])).toBe('C5 AIRCROSS')
    expect(commonModelName(['A B', 'C D'])).toBe('A B')
  })
})

describe('mergeIssueRows', () => {
  it('sums bands, groups and reasons', () => {
    const a = { band: 0, tests: 10, dangerous: 1, groups: { brakes: [1, 2] as [number, number] }, reasons: {} }
    const b = {
      band: 0,
      tests: 5,
      dangerous: 2,
      groups: { brakes: [3, 4] as [number, number] },
      reasons: { r: [1, 1] as [number, number] }
    }
    const c = { band: 1, tests: 7, dangerous: 0, groups: {}, reasons: {} }
    const merged = mergeIssueRows([a, b, c])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({ tests: 15, dangerous: 3, groups: { brakes: [4, 6] }, reasons: { r: [1, 1] } })
  })
})
