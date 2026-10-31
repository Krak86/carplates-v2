import type { RoadSafetyRegionsResponse, RoadSafetyYear } from '@carplates/shared'

export type RegionRow = {
  region: string
  crashes: number
  deaths: number
  injured: number
  pedestrianCrashes: number | null
  childCrashes: number | null
}

const FULL_YEAR_PERIOD = 12

/**
 * Resolves `?year=` against the loaded files: the newest period of that year, or (no year) of the latest full year, falling
 * back to the latest file when no year is complete. Null when the year has no data.
 */
export function pickYear(files: { year: number; period: number }[], year?: number): RoadSafetyYear | null {
  const newest = new Map<number, number>()
  for (const f of files) newest.set(f.year, Math.max(newest.get(f.year) ?? 0, f.period))
  const years = [...newest.entries()]
    .map(([y, period]) => ({ year: y, period, partial: period < FULL_YEAR_PERIOD }))
    .sort((a, b) => b.year - a.year)
  if (year !== undefined) return years.find(y => y.year === year) ?? null
  return years.find(y => !y.partial) ?? years[0] ?? null
}

/** Same files as {@link pickYear}, newest year first, one entry per year. */
export function listYears(files: { year: number; period: number }[]): RoadSafetyYear[] {
  return [...new Set(files.map(f => f.year))]
    .sort((a, b) => b - a)
    .flatMap(year => {
      const picked = pickYear(files, year)
      return picked ? [picked] : []
    })
}

/** Standard competition ranks (1, 2, 2, 4) of `values` sorted descending, keyed by input index. */
function rankDescending(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const ranks = new Array<number>(values.length)
  order.forEach((o, pos) => {
    ranks[o.i] = pos > 0 && order[pos - 1]!.v === o.v ? ranks[order[pos - 1]!.i]! : pos + 1
  })
  return ranks
}

const per100k = (n: number, fleet: number | null): number | null =>
  fleet ? Math.round((n / fleet) * 100_000 * 100) / 100 : null

/** Regions with their per-100k rates and ranks (deaths absolute, deaths per 100k registered cars), most deaths first. */
export function buildRegions(
  rows: RegionRow[],
  fleets: ReadonlyMap<string, number>
): RoadSafetyRegionsResponse['regions'] {
  const sorted = [...rows].sort((a, b) => b.deaths - a.deaths || a.region.localeCompare(b.region, 'uk'))
  const rankDeaths = rankDescending(sorted.map(r => r.deaths))

  const withRate = sorted.map(r => {
    const fleet = fleets.get(r.region) ?? null
    return { r, fleet, deathsPer100k: per100k(r.deaths, fleet), crashesPer100k: per100k(r.crashes, fleet) }
  })
  const rated = withRate.filter(x => x.deathsPer100k !== null)
  const ratedRanks = rankDescending(rated.map(x => x.deathsPer100k ?? 0))
  const rankByRegion = new Map(rated.map((x, i) => [x.r.region, ratedRanks[i]!]))

  return withRate.map((x, i) => ({
    ...x.r,
    fleet: x.fleet,
    deathsPer100k: x.deathsPer100k,
    crashesPer100k: x.crashesPer100k,
    rankDeaths: rankDeaths[i]!,
    rankDeathsPer100k: rankByRegion.get(x.r.region) ?? null
  }))
}
