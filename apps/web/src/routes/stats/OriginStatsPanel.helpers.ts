import type { OriginStatsResponse } from '@carplates/shared'

/** Countries listed per board before the rest folds into "Other". */
export const ORIGIN_STATS_TOP_N = 8

export type OriginBar = { country: string; n: number; share: number }

export type OriginBars = {
  bars: OriginBar[]
  /** Cars of the countries below the cut-off. */
  other: number
  /** Cars with no known country (brand not matched, or no standard VIN). */
  unknown: number
  /** Largest share among `bars`; the widest bar is 100 % of the track. */
  maxShare: number
}

/** Top countries of one board with shares of all counted cars; the unknown bucket ('') and the tail are kept apart. */
export function originBars(
  rows: OriginStatsResponse['byBrand'],
  total: number,
  limit: number = ORIGIN_STATS_TOP_N
): OriginBars {
  const known = rows.filter(r => r.country !== '')
  const bars = known.slice(0, limit).map(r => ({ country: r.country, n: r.n, share: total > 0 ? r.n / total : 0 }))
  return {
    bars,
    other: known.slice(limit).reduce((sum, r) => sum + r.n, 0),
    unknown: rows.filter(r => r.country === '').reduce((sum, r) => sum + r.n, 0),
    maxShare: bars.reduce((max, b) => Math.max(max, b.share), 0)
  }
}
