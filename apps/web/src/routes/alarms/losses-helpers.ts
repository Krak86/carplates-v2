import { LOSS_CATEGORIES } from '@carplates/shared'
import type { LossCategory, LossCounters, LossesHistoryResponse } from '@carplates/shared'

export type LossRow = { category: LossCategory; total: number | null; increase: number | null }

/** Categories in the fixed order of `LOSS_CATEGORIES`; a missing counter stays null (shown as "-"), never 0. */
export const lossRows = (stats: LossCounters, increase: LossCounters): LossRow[] =>
  LOSS_CATEGORIES.map(category => ({
    category,
    total: stats[category] ?? null,
    increase: increase[category] ?? null
  }))

/** "+12" / "-3" / "0"; null when upstream gave no figure. */
export const signed = (value: number | null): string | null =>
  value === null ? null : value > 0 ? `+${value}` : String(value)

export const CHART_WIDTH = 600
export const CHART_HEIGHT = 120

/**
 * SVG path of the running total over time. X is the calendar date (so skipped days leave a gap in time, not a squeezed line),
 * Y starts at 0. At most `maxPoints` vertices (about one per pixel) keep the path short for ~1,700 days.
 */
export function totalsPath(points: LossesHistoryResponse['points'], maxPoints = CHART_WIDTH): string {
  if (points.length < 2) return ''
  const t0 = Date.parse(points[0]!.date)
  const span = Math.max(1, Date.parse(points[points.length - 1]!.date) - t0)
  const max = Math.max(1, ...points.map(p => p.total))
  const stride = Math.max(1, Math.ceil(points.length / maxPoints))
  const picked = points.filter((_, i) => i % stride === 0 || i === points.length - 1)
  return picked
    .map((p, i) => {
      const x = ((Date.parse(p.date) - t0) / span) * CHART_WIDTH
      const y = CHART_HEIGHT - (p.total / max) * CHART_HEIGHT
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join('')
}
