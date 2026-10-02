import { crashBand } from '@carplates/shared'
import type { CrashBand, SafetyStatsRow } from '@carplates/shared'

/** Bar length (0–100) for an average crash score — the score is already on a 0–100 scale. */
export function barPercent(avgScore: number | null): number {
  if (avgScore == null) return 0
  return Math.max(0, Math.min(100, avgScore))
}

export function bandForScore(avgScore: number): CrashBand {
  return crashBand(avgScore)
}

/** Share (0–100) of a row's cars that have a crash rating. */
export function coveragePercent(row: Pick<SafetyStatsRow, 'n' | 'matched'>): number {
  return row.n > 0 ? (row.matched / row.n) * 100 : 0
}
