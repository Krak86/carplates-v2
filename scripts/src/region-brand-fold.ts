import type { StatsRegionBrandInsert } from '@carplates/db'
import { brandSlug } from '@carplates/shared'

const BRANDS_PER_REGION = 5

export type RegionBrandRow = { region: string; brand: string; n: number }

/**
 * Folds spellings of one brand (same logo slug, else same upper-cased text) and keeps the top ones per region, plus one
 * row with an empty brand that holds the region's whole fleet.
 */
export function foldRegionBrands(rows: readonly RegionBrandRow[]): StatsRegionBrandInsert[] {
  const regions = new Map<string, Map<string, { top: RegionBrandRow; n: number }>>()
  const fleet = new Map<string, number>()
  for (const r of rows) {
    fleet.set(r.region, (fleet.get(r.region) ?? 0) + r.n)
    const key = brandSlug(r.brand) ?? r.brand.toUpperCase()
    const brands = regions.get(r.region) ?? new Map<string, { top: RegionBrandRow; n: number }>()
    const group = brands.get(key)
    if (!group) {
      brands.set(key, { top: r, n: r.n })
    } else {
      group.n += r.n
      if (r.n > group.top.n) group.top = r
    }
    regions.set(r.region, brands)
  }

  const out: StatsRegionBrandInsert[] = []
  for (const [region, brands] of regions) {
    out.push({ region, brand: '', n: fleet.get(region) ?? 0 })
    const top = [...brands.values()].sort((a, b) => b.n - a.n).slice(0, BRANDS_PER_REGION)
    for (const g of top) out.push({ region, brand: g.top.brand, n: g.n })
  }
  return out
}
