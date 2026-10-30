import type { CatalogModel } from '@carplates/shared'

type Counts = CatalogModel['stats']['years']

/** The model year with the most cars: the "typical" year that the per-year sections (specs, value, recalls) are asked about. */
export function typicalYear(years: Counts): number | null {
  let best: [string, number] | null = null
  for (const row of years) if (!best || row[1] > best[1]) best = row
  return best ? Number(best[0]) : null
}

/** `2005-2024`, a single year, or null when unknown. Same rule as the server text (`catalog-text.ts`). */
export function yearRangeLabel(m: Pick<CatalogModel, 'yearMin' | 'yearMax'>): string | null {
  if (!m.yearMin || !m.yearMax) return null
  return m.yearMin === m.yearMax ? String(m.yearMin) : `${m.yearMin}-${m.yearMax}`
}

/** Whole-number share of `n` in `total` (0 for an empty total). */
export const sharePercent = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 100) : 0)

/** The biggest `limit` years, shown oldest first (the server block lists the same rows). */
export function biggestYears(years: Counts, limit: number): Counts {
  return [...years]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
}

export const CATALOG_BLOCK_YEARS = 12
export const CATALOG_BLOCK_ROWS = 6
