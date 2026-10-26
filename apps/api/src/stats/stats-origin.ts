import type { OriginStatsResponse } from '@carplates/shared'

type Row = { brandCountry: string; plantCountry: string; n: number }

function byCountry(totals: Map<string, number>): OriginStatsResponse['byBrand'] {
  return [...totals.entries()]
    .map(([country, n]) => ({ country, n }))
    .sort((a, b) => Number(a.country === '') - Number(b.country === '') || b.n - a.n)
}

/** Sums the rollup rows per brand country and per assembly country; the unknown bucket ('') always goes last. */
export function foldOriginStats(rows: readonly Row[]): OriginStatsResponse {
  const brand = new Map<string, number>()
  const plant = new Map<string, number>()
  let total = 0
  for (const r of rows) {
    total += r.n
    brand.set(r.brandCountry, (brand.get(r.brandCountry) ?? 0) + r.n)
    plant.set(r.plantCountry, (plant.get(r.plantCountry) ?? 0) + r.n)
  }
  return { total, byBrand: byCountry(brand), byPlant: byCountry(plant) }
}
