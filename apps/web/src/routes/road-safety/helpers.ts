import type { RoadSafetyRegionsResponse, RoadSafetyYear } from '@carplates/shared'

type RegionRow = RoadSafetyRegionsResponse['regions'][number]
type Bucket = { bucket: number; crashes: number }

/** `?year=` of the page: a plausible four-digit year, else undefined (the API then answers with the latest full year). */
export function parseYearParam(value: string | null): number | undefined {
  const year = Number(value)
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined
}

/** Regions in ranking order: most deaths, or the highest rate (regions without a fleet figure have no rate rank and are left out). */
export function rankedRegions(regions: readonly RegionRow[], by: 'deaths' | 'rate'): RegionRow[] {
  if (by === 'deaths') return regions.toSorted((a, b) => a.rankDeaths - b.rankDeaths)
  return regions
    .filter(r => r.rankDeathsPer100k !== null)
    .toSorted((a, b) => (a.rankDeathsPer100k ?? 0) - (b.rankDeathsPer100k ?? 0))
}

/** Bar length in percent of the largest value (a non-zero value never vanishes). */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0
  return Math.max(2, Math.min(100, (value / max) * 100))
}

/** The bucket with the most crashes (first on a tie), or null when there is none. */
export function peakBucket(buckets: readonly Bucket[]): Bucket | null {
  let peak: Bucket | null = null
  for (const b of buckets) if (!peak || b.crashes > peak.crashes) peak = b
  return peak && peak.crashes > 0 ? peak : null
}

/** Weekday name for a 1 (Monday) .. 7 bucket. 2024-01-01 was a Monday. */
export function weekdayLabel(bucket: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, bucket))
}

/** Zero-padded hour label, "07:00". */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Fills missing buckets (a file may omit a quiet hour) so a chart has one column per `first..last`. */
export function fillBuckets(buckets: readonly Bucket[], first: number, last: number): Bucket[] {
  const byBucket = new Map(buckets.map(b => [b.bucket, b.crashes]))
  return Array.from({ length: last - first + 1 }, (_, i) => ({
    bucket: first + i,
    crashes: byBucket.get(first + i) ?? 0
  }))
}

/** Last reported month of a partial year, or null for a full one. */
export function partialMonth(year: RoadSafetyYear): number | null {
  return year.partial ? year.period : null
}

export const REGION_MAP_METRICS = ['deaths', 'rate'] as const
export type RegionMapMetric = (typeof REGION_MAP_METRICS)[number]

/** Map rows (`label` = region name): deaths, or deaths per 100k rounded to one decimal; regions without a rate are left out. */
export function mapRows(regions: readonly RegionRow[], metric: RegionMapMetric): { label: string; value: number }[] {
  const rows: { label: string; value: number }[] = []
  for (const r of regions) {
    if (metric === 'deaths') rows.push({ label: r.region, value: r.deaths })
    else if (r.deathsPer100k !== null) rows.push({ label: r.region, value: Math.round(r.deathsPer100k * 10) / 10 })
  }
  return rows
}

export type RegionCrashFact = { year: number; crashes: number; rank: number; of: number }

/** The plate card's "N crashes in <year>, rank k of M" for one region (deaths rank), or null when the year has no row for it. */
export function regionCrashFact(data: RoadSafetyRegionsResponse, region: string | null): RegionCrashFact | null {
  const row = region ? data.regions.find(r => r.region === region) : undefined
  if (!row) return null
  return { year: data.year, crashes: row.crashes, rank: row.rankDeaths, of: data.regions.length }
}
