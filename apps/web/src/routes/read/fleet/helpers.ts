import { resolveFuelCategories, resolveVehicleColor } from '@carplates/shared'
import type { StatsByDimensionRow, VehicleColor, VehicleFuel } from '@carplates/shared'

/** Registration years counted as "recent" in the age summary. */
export const RECENT_YEARS = 5

export type Share<K> = { key: K; n: number }

const bySize = <K>(a: Share<K>, b: Share<K>): number => b.n - a.n

/** Registry colours folded onto the canonical palette (three spellings of orange merge); unknown values are dropped. */
export function colorShares(rows: readonly StatsByDimensionRow[]): Share<VehicleColor>[] {
  const merged = new Map<VehicleColor, number>()
  for (const row of rows) {
    const color = resolveVehicleColor(row.value)
    if (color) merged.set(color, (merged.get(color) ?? 0) + row.distinctPlates)
  }
  return [...merged.entries()].map(([key, n]) => ({ key, n })).sort(bySize)
}

/** A fuel group is the set of base fuels a registry value names, so a petrol + gas car is its own "petrol+gas" group. */
export function fuelShares(rows: readonly StatsByDimensionRow[]): Share<readonly VehicleFuel[]>[] {
  const merged = new Map<string, { fuels: VehicleFuel[]; n: number }>()
  for (const row of rows) {
    const fuels = resolveFuelCategories(row.value)
    if (fuels.length === 0) continue
    const id = fuels.join('+')
    const entry = merged.get(id) ?? { fuels, n: 0 }
    entry.n += row.distinctPlates
    merged.set(id, entry)
  }
  return [...merged.values()].map(({ fuels, n }) => ({ key: fuels, n })).sort(bySize)
}

export type AgeSummary = {
  /** Oldest first, only years with a date. */
  years: Share<number>[]
  total: number
  medianYear: number | null
  /** 0–100, registrations in the last `RECENT_YEARS` years including this one. */
  recentPercent: number
}

/** Registrations per year (`value` is the year as text), the median year and the recent share. */
export function ageSummary(rows: readonly StatsByDimensionRow[], thisYear: number): AgeSummary {
  const years = rows
    .map(row => ({ key: Number(row.value), n: row.distinctPlates }))
    .filter(row => row.key > 1900 && row.key <= thisYear && row.n > 0)
    .sort((a, b) => a.key - b.key)
  const total = years.reduce((sum, row) => sum + row.n, 0)

  let seen = 0
  const medianYear = years.find(row => (seen += row.n) * 2 >= total)?.key ?? null

  const recent = years.filter(row => row.key > thisYear - RECENT_YEARS).reduce((sum, row) => sum + row.n, 0)
  return { years, total, medianYear, recentPercent: total > 0 ? Math.round((recent / total) * 100) : 0 }
}
