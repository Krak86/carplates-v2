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

type FleetRow = Pick<RegionRow, 'region' | 'crashes' | 'deaths' | 'injured' | 'fleet'>

/** Pearson correlation of two equal-length series, or null with fewer than 3 points or no variance. */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx
    const dy = (ys[i] ?? 0) - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy)
}

/** Words for |r|: the page shows the number too, this only keeps the text honest ("strong", not "proves"). */
export function correlationStrength(r: number): 'none' | 'weak' | 'moderate' | 'strong' {
  const a = Math.abs(r)
  if (a < 0.3) return 'none'
  if (a < 0.5) return 'weak'
  if (a < 0.8) return 'moderate'
  return 'strong'
}

export type FleetPoint = {
  region: string
  fleet: number
  deaths: number
  crashes: number
  /** Share of national deaths divided by share of the national fleet: 1 = as many deaths as its cars suggest. */
  ratio: number
}

/** Regions that have both a fleet figure and crashes, with the deaths-to-fleet ratio. Empty when there is nothing to compare. */
export function fleetPoints(regions: readonly FleetRow[]): FleetPoint[] {
  const rows = regions.filter(r => r.fleet !== null && r.fleet > 0)
  const fleetTotal = rows.reduce((a, r) => a + (r.fleet ?? 0), 0)
  const deathsTotal = rows.reduce((a, r) => a + r.deaths, 0)
  if (fleetTotal === 0 || deathsTotal === 0) return []
  return rows.map(r => ({
    region: r.region,
    fleet: r.fleet ?? 0,
    deaths: r.deaths,
    crashes: r.crashes,
    ratio: r.deaths / deathsTotal / ((r.fleet ?? 0) / fleetTotal)
  }))
}

export type RegionFacts = {
  mostDeaths: RegionRow
  fewestDeaths: RegionRow
  highestRate: RegionRow | null
  lowestRate: RegionRow | null
  /** Deaths per 100 crashes: how often a crash kills. */
  deadliest: { region: string; per100: number } | null
  safest: { region: string; per100: number } | null
  /** Largest and smallest deaths-to-fleet ratio. */
  overRepresented: FleetPoint | null
  underRepresented: FleetPoint | null
  /** Top-3 regions' share of national deaths in percent, over the regions in the data. */
  top3Share: number
}

/** Interesting cases of one year for the facts block, or null with fewer than 3 regions. */
export function regionFacts(regions: readonly RegionRow[]): RegionFacts | null {
  if (regions.length < 3) return null
  const byDeaths = rankedRegions(regions, 'deaths')
  const byRate = rankedRegions(regions, 'rate')
  const lethal = regions
    .filter(r => r.crashes >= 100)
    .map(r => ({ region: r.region, per100: (r.deaths / r.crashes) * 100 }))
    .toSorted((a, b) => b.per100 - a.per100)
  const points = fleetPoints(regions).toSorted((a, b) => b.ratio - a.ratio)
  const total = regions.reduce((a, r) => a + r.deaths, 0)
  const top3 = byDeaths.slice(0, 3).reduce((a, r) => a + r.deaths, 0)
  return {
    mostDeaths: byDeaths[0] as RegionRow,
    fewestDeaths: byDeaths[byDeaths.length - 1] as RegionRow,
    highestRate: byRate[0] ?? null,
    lowestRate: byRate[byRate.length - 1] ?? null,
    deadliest: lethal[0] ?? null,
    safest: lethal[lethal.length - 1] ?? null,
    overRepresented: points[0] ?? null,
    underRepresented: points[points.length - 1] ?? null,
    top3Share: total > 0 ? (top3 / total) * 100 : 0
  }
}

/** OpenStreetMap link for a hazard point. */
export function osmUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
}

/** "12+300" km marker for a metre value, or '' when missing. */
export function kmLabel(metres: number | null): string {
  if (metres === null) return ''
  return `${Math.floor(metres / 1000)}+${String(metres % 1000).padStart(3, '0')}`
}
