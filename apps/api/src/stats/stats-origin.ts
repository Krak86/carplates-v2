import type { OriginStatsResponse } from '@carplates/shared'

type Row = { makeYear?: number; brandCountry: string; plantCountry: string; n: number }

function byCountry(totals: Map<string, number>): OriginStatsResponse['byBrand'] {
  return [...totals.entries()]
    .map(([country, n]) => ({ country, n }))
    .sort((a, b) => Number(a.country === '') - Number(b.country === '') || b.n - a.n)
}

/** Sums the rollup rows per brand country and per assembly country; the unknown bucket ('') always goes last. */
export function foldOriginStats(rows: readonly Row[]): OriginStatsResponse {
  const brand = new Map<string, number>()
  const plant = new Map<string, number>()
  const years = new Map<number, number>()
  let total = 0
  for (const r of rows) {
    total += r.n
    years.set(r.makeYear ?? 0, (years.get(r.makeYear ?? 0) ?? 0) + r.n)
    brand.set(r.brandCountry, (brand.get(r.brandCountry) ?? 0) + r.n)
    plant.set(r.plantCountry, (plant.get(r.plantCountry) ?? 0) + r.n)
  }
  const byMakeYear = [...years.entries()].map(([year, n]) => ({ year, n })).sort((a, b) => a.year - b.year)
  return { total, byBrand: byCountry(brand), byPlant: byCountry(plant), byMakeYear }
}
