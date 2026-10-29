import type { StatsRegionFacetInsert } from '@carplates/db'

export type FacetCount = { region: string; key: string; value: string; n: number }

/**
 * Sums counts per (region, key) so spellings of one thing fold together, labels the group with its most common spelling and
 * keeps the `limit` biggest per region.
 */
export function foldFacet(facet: string, rows: readonly FacetCount[], limit: number): StatsRegionFacetInsert[] {
  const regions = new Map<string, Map<string, { top: FacetCount; n: number }>>()
  for (const r of rows) {
    const groups = regions.get(r.region) ?? new Map<string, { top: FacetCount; n: number }>()
    const group = groups.get(r.key)
    if (!group) {
      groups.set(r.key, { top: r, n: r.n })
    } else {
      group.n += r.n
      if (r.n > group.top.n) group.top = r
    }
    regions.set(r.region, groups)
  }

  const out: StatsRegionFacetInsert[] = []
  for (const [region, groups] of regions) {
    const top = [...groups.values()].sort((a, b) => b.n - a.n).slice(0, limit)
    for (const g of top) out.push({ facet, region, value: g.top.value, n: g.n })
  }
  return out
}
