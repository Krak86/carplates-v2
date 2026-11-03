import type { OriginStatsResponse } from '@carplates/shared'

/** Vehicle age buckets, newest first; `max` is the inclusive upper age in years (null = open-ended). */
export const AGE_BUCKETS = [
  { key: 'new', max: 0 },
  { key: 'y1to5', max: 5 },
  { key: 'y6to10', max: 10 },
  { key: 'y11to20', max: 20 },
  { key: 'y21plus', max: null }
] as const
export type AgeBucketKey = (typeof AGE_BUCKETS)[number]['key']

export const AGE_VALUE_MODES = ['share', 'count'] as const
export type AgeValueMode = (typeof AGE_VALUE_MODES)[number]
export const DEFAULT_AGE_VALUE_MODE: AgeValueMode = 'share'

export type AgeBar = { key: AgeBucketKey; n: number; share: number; colorVar: string }

export type AgeBars = {
  bars: AgeBar[]
  /** Cars with an unknown model year (excluded from the shares). */
  unknown: number
  /** Cars with a known model year; the denominator of the shares. */
  total: number
}

/** Cars by age bucket at `currentYear`; model year 0 (unknown) is kept apart, a future model year counts as new. */
export function ageBars(rows: NonNullable<OriginStatsResponse['byMakeYear']>, currentYear: number): AgeBars {
  const counts = AGE_BUCKETS.map(() => 0)
  let unknown = 0
  for (const r of rows) {
    if (r.year === 0) {
      unknown += r.n
      continue
    }
    const age = Math.max(0, currentYear - r.year)
    const idx = AGE_BUCKETS.findIndex(b => b.max === null || age <= b.max)
    counts[idx] = (counts[idx] ?? 0) + r.n
  }
  const total = counts.reduce((sum, n) => sum + n, 0)
  return {
    bars: AGE_BUCKETS.map((b, i) => {
      const n = counts[i] ?? 0
      return { key: b.key, n, share: total > 0 ? n / total : 0, colorVar: `var(--age-${i})` }
    }),
    unknown,
    total
  }
}
