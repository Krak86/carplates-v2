import { describe, expect, it } from 'vitest'

import type { CompareRow, CompareValue } from './types'
import { buildBars, buildHighlights, diffPercent, numericPairs } from './visuals'

const row = (id: string, a: CompareValue, b: CompareValue, over: Partial<CompareRow> = {}): CompareRow => ({
  id,
  group: 'engine',
  labelKey: `l.${id}`,
  unitKey: 'u',
  values: [a, b],
  valueKind: 'number',
  direction: 'neutral',
  source: 'rdw',
  ...over
})

describe('numericPairs', () => {
  it('keeps unit rows with two positive numbers only', () => {
    const rows = [
      row('ok', 100, 120),
      row('gap', 100, null),
      row('zero', 0, 5),
      row('noUnit', 2015, 2020, { unitKey: undefined }),
      row('text', 'x', 'y', { valueKind: 'text' })
    ]
    expect(numericPairs(rows).map(p => p.row.id)).toEqual(['ok'])
  })
})

describe('diffPercent', () => {
  it('is relative to the smaller value and capped', () => {
    expect(diffPercent(100, 150)).toBe(50)
    expect(diffPercent(150, 100)).toBe(50)
    expect(diffPercent(1, 5000)).toBe(999)
  })
})

describe('buildHighlights', () => {
  it('sorts by difference, drops small ones and names the larger side', () => {
    const rows = [row('small', 100, 102), row('mid', 100, 130), row('big', 300, 100)]
    const h = buildHighlights(rows)
    expect(h.map(x => [x.row.id, x.side, x.percent])).toEqual([
      ['big', 0, 200],
      ['mid', 1, 30]
    ])
  })

  it('respects the limit', () => {
    const rows = [row('a', 1, 2), row('b', 1, 3), row('c', 1, 4)]
    expect(buildHighlights(rows, 2)).toHaveLength(2)
  })
})

describe('buildBars', () => {
  it('scales to the larger value of each row', () => {
    const [bar] = buildBars([row('p', 50, 200)])
    expect(bar).toMatchObject({ widthA: 0.25, widthB: 1, larger: 1, percent: 300 })
  })

  it('has no larger side on a tie', () => {
    expect(buildBars([row('p', 80, 80)])[0]?.larger).toBeNull()
  })
})
