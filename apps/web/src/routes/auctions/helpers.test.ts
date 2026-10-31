import { describe, expect, it } from 'vitest'

import { formatDelta, monthLabel, pageCount, soldPercent, sortRows, withSoldPercent } from '@/routes/auctions/helpers'

const row = (label: string, lots: number, sold: number, avgDeltaPercent: number | null, medianSale: number | null) => ({
  label,
  lots,
  sold,
  open: 0,
  avgDeltaPercent,
  medianSale
})

describe('soldPercent', () => {
  it('is the sold share with one decimal and 0 without lots', () => {
    expect(soldPercent({ lots: 3, sold: 1 })).toBe(33.3)
    expect(soldPercent({ lots: 0, sold: 0 })).toBe(0)
  })
})

describe('formatDelta', () => {
  it('signs the change and shows a dash without data', () => {
    expect(formatDelta(27.1, 'en')).toBe('+27.1%')
    expect(formatDelta(-12, 'en')).toBe('-12%')
    expect(formatDelta(null, 'en')).toBe('-')
  })
})

describe('pageCount', () => {
  it('rounds up and is at least one', () => {
    expect(pageCount(0, 25)).toBe(1)
    expect(pageCount(26, 25)).toBe(2)
  })
})

describe('sortRows', () => {
  const rows = withSoldPercent([row('B', 10, 5, null, 100), row('A', 20, 4, 3, null), row('C', 5, 5, 8, 50)])

  it('sorts numbers with nulls last in both directions', () => {
    expect(sortRows(rows, 'avgDeltaPercent', true, 'en').map(r => r.label)).toEqual(['C', 'A', 'B'])
    expect(sortRows(rows, 'avgDeltaPercent', false, 'en').map(r => r.label)).toEqual(['A', 'C', 'B'])
  })

  it('sorts labels as text and does not mutate', () => {
    expect(sortRows(rows, 'label', false, 'en').map(r => r.label)).toEqual(['A', 'B', 'C'])
    expect(rows.map(r => r.label)).toEqual(['B', 'A', 'C'])
  })
})

describe('monthLabel', () => {
  it('formats YYYY-MM and passes other labels through', () => {
    expect(monthLabel('2024-08', 'en')).toContain('2024')
    expect(monthLabel('Київ', 'en')).toBe('Київ')
  })
})
