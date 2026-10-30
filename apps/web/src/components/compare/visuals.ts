import type { CompareRow } from './types'

/** A difference under this share of the smaller value is not worth a sentence or a bar label. */
export const MIN_DIFF_PERCENT = 5
export const MAX_HIGHLIGHTS = 5

export type NumericPair = { row: CompareRow; a: number; b: number }

/** Rows with a unit where both cars have a positive number (years, counts and words are not bar material). */
export function numericPairs(rows: readonly CompareRow[]): NumericPair[] {
  const out: NumericPair[] = []
  for (const row of rows) {
    const [a, b] = row.values
    if (row.valueKind !== 'number' || !row.unitKey) continue
    if (typeof a !== 'number' || typeof b !== 'number' || !(a > 0) || !(b > 0)) continue
    out.push({ row, a, b })
  }
  return out
}

/** How much larger the bigger value is than the smaller, in whole percent (capped so a ratio never fills the line). */
export function diffPercent(a: number, b: number): number {
  const small = Math.min(a, b)
  return Math.min(999, Math.round(((Math.max(a, b) - small) / small) * 100))
}

export type Highlight = { row: CompareRow; side: 0 | 1; percent: number }

/** The biggest relative differences, as "side has N% more of this row". The larger value wins the sentence. */
export function buildHighlights(rows: readonly CompareRow[], limit = MAX_HIGHLIGHTS): Highlight[] {
  return numericPairs(rows)
    .map(({ row, a, b }) => ({ row, side: (a > b ? 0 : 1) as 0 | 1, percent: diffPercent(a, b) }))
    .filter(h => h.percent >= MIN_DIFF_PERCENT)
    .sort((x, y) => y.percent - x.percent)
    .slice(0, limit)
}

export type BarPair = NumericPair & {
  /** Bar lengths as 0..1 of the row's larger value (a zero baseline, so the lengths are honest). */
  widthA: number
  widthB: number
  /** Side with the larger value, null when equal. */
  larger: 0 | 1 | null
  percent: number
}

export function buildBars(rows: readonly CompareRow[]): BarPair[] {
  return numericPairs(rows).map(p => {
    const max = Math.max(p.a, p.b)
    return {
      ...p,
      widthA: p.a / max,
      widthB: p.b / max,
      larger: p.a === p.b ? null : p.a > p.b ? 0 : 1,
      percent: diffPercent(p.a, p.b)
    }
  })
}

/** Series colour of car A and car B (HDR / oklch tokens in global.css). */
export const SIDE_COLOR = ['var(--color-compare-a)', 'var(--color-compare-b)'] as const
