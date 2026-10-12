import { describe, it, expect } from 'vitest'

import { type MotData, mergeMotData } from './mot-store.js'

const base = (year: number, tests: number, reasons: Record<string, [number, number]>): MotData => ({
  years: [year],
  keys: [{ kind: 'car', makeKey: 'ford', modelKey: 'focus', make: 'FORD', model: 'FOCUS', tests }],
  stats: [
    { kind: 'car', makeKey: 'ford', modelKey: 'focus', modelYear: 2015, band: 2, tests, fails: 1, advisories: 2 }
  ],
  issues: [
    {
      kind: 'car',
      makeKey: 'ford',
      modelKey: 'focus',
      band: 2,
      tests,
      dangerous: 1,
      groups: { brakes: [1, 2] },
      reasons
    }
  ],
  baseline: [{ kind: 'car', band: 2, tests, fails: 1, advisories: 2, dangerous: 1, groups: { brakes: [1, 2] } }],
  reasons: [{ code: 'a', group: 'brakes', item: 'Disc', failText: 'f', watchText: 'w' }],
  diagnostics: {}
})

describe('mergeMotData', () => {
  it('sums counts of the same cell and keeps the years of both runs', () => {
    const m = mergeMotData(base(2023, 10, { a: [1, 1] }), base(2025, 5, { a: [2, 0], b: [1, 1] }))
    expect(m.years).toEqual([2023, 2025])
    expect(m.keys[0]!.tests).toBe(15)
    expect(m.stats).toEqual([expect.objectContaining({ tests: 15, fails: 2, advisories: 4 })])
    expect(m.issues[0]).toMatchObject({
      tests: 15,
      dangerous: 2,
      groups: { brakes: [2, 4] },
      reasons: { a: [3, 1], b: [1, 1] }
    })
    expect(m.baseline[0]).toMatchObject({ tests: 15, fails: 2, groups: { brakes: [2, 4] } })
    expect(m.reasons).toHaveLength(1)
  })

  it('adds models and cells that only the new run has', () => {
    const next = base(2025, 5, {})
    next.keys[0]!.modelKey = 'fiesta'
    next.stats[0]!.modelKey = 'fiesta'
    next.issues[0]!.modelKey = 'fiesta'
    const m = mergeMotData(base(2023, 10, {}), next)
    expect(m.keys.map(k => k.modelKey).sort()).toEqual(['fiesta', 'focus'])
    expect(m.stats).toHaveLength(2)
  })
})
