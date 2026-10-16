import type { ImportsStatsResponse } from '@carplates/shared'

/** ISO codes of the VIN blocks read as "built for the US / Canada market" (WMI first character 1, 4, 5 and 2). */
export const NORTH_AMERICA = ['US', 'CA'] as const

export type ImportYear = ImportsStatsResponse['byYear'][number]

/** Import share of a year's imported + dealer-sold cars, 0–100 with one decimal (0 for an empty year). */
export function importShare(year: Pick<ImportYear, 'import' | 'dealer'>): number {
  const all = year.import + year.dealer
  return all > 0 ? Math.round((year.import / all) * 1000) / 10 : 0
}

/** The year with the most imports, null when there are none. */
export function peakImportYear(years: readonly ImportYear[]): ImportYear | null {
  return years.reduce<ImportYear | null>((best, y) => (y.import > (best?.import ?? 0) ? y : best), null)
}

export type CountrySplit = {
  /** Cars whose VIN block is the US or Canada. */
  northAmerica: number
  /** Cars with no VIN country (no VIN, or a block the table does not know). */
  unknown: number
  /** Everything else with a known country. */
  other: number
  /** All imported cars of `byCountry` (the listed countries only). */
  total: number
}

/** Splits the listed import countries into US / Canada, unknown and the rest. */
export function splitCountries(byCountry: ImportsStatsResponse['byCountry']): CountrySplit {
  const split: CountrySplit = { northAmerica: 0, unknown: 0, other: 0, total: 0 }
  for (const { country, n } of byCountry) {
    split.total += n
    if (!country) split.unknown += n
    else if ((NORTH_AMERICA as readonly string[]).includes(country)) split.northAmerica += n
    else split.other += n
  }
  return split
}

/** Share of `part` in `whole` as 0–100 with one decimal (0 when `whole` is 0). */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0
}
