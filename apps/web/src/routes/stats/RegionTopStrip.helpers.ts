export const REGION_TOP_N = 3

export type RegionShare = { region: string; value: number; share: number }

/**
 * The `n` biggest regions by `value` with their share of the whole country (all rows, not only the top). Regions without a
 * value are left out; ties keep the input order.
 */
export function topRegionShares(
  rows: readonly { label: string; value: number }[],
  n: number = REGION_TOP_N
): RegionShare[] {
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  if (total <= 0) return []
  return rows
    .filter(r => r.value > 0)
    .map((r, i) => ({ region: r.label, value: r.value, share: r.value / total, i }))
    .sort((a, b) => b.value - a.value || a.i - b.i)
    .slice(0, n)
    .map(({ region, value, share }) => ({ region, value, share }))
}
