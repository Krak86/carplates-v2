import type { RoadSafetyHazardsResponse, RoadSafetyRegionsResponse } from '@carplates/shared'

type Hazard = RoadSafetyHazardsResponse['hazards'][number]
type RegionRow = RoadSafetyRegionsResponse['regions'][number]

/** Rough bounding box of Ukraine: a coordinate outside it in the source file is a typo, never drawn. */
const BOUNDS = { lonMin: 21, lonMax: 41, latMin: 44, latMax: 53 }

/** Dot radius in map units (before zoom): from the plain dot up to a cap, growing with the crashes of three years. */
const DOT_MIN = 2.2
const DOT_MAX = 6
const DOT_FULL_AT = 30

export type HazardDot = { key: string; x: number; y: number; r: number; hazard: Hazard }

const inBounds = (lon: number, lat: number): boolean =>
  lon >= BOUNDS.lonMin && lon <= BOUNDS.lonMax && lat >= BOUNDS.latMin && lat <= BOUNDS.latMax

export const dotRadius = (crashes: number | null): number =>
  DOT_MIN + (DOT_MAX - DOT_MIN) * Math.min(1, Math.max(0, crashes ?? 0) / DOT_FULL_AT)

/** Hazards with plausible coordinates as map dots, biggest first so small dots stay on top and clickable. */
export function hazardDots(
  hazards: readonly Hazard[],
  project: (lon: number, lat: number) => readonly [number, number] | null
): HazardDot[] {
  const dots: HazardDot[] = []
  hazards.forEach((hazard, i) => {
    if (hazard.lat === null || hazard.lon === null || !inBounds(hazard.lon, hazard.lat)) return
    const point = project(hazard.lon, hazard.lat)
    if (!point) return
    dots.push({
      key: `${i}-${hazard.roadCode}-${hazard.kmStart ?? ''}`,
      x: point[0],
      y: point[1],
      r: dotRadius(hazard.crashes3y),
      hazard
    })
  })
  return dots.sort((a, b) => b.r - a.r)
}

export type RegionRoads = { deaths: number; crashes: number; hazards: number; withoutCoordinates: number }

/** One region's road-crash totals of the year and how many listed sections it has (of which without a usable coordinate). */
export function regionRoads(
  region: string,
  regions: readonly RegionRow[] | undefined,
  hazards: readonly Hazard[] | undefined
): RegionRoads | null {
  const row = regions?.find(r => r.region === region)
  if (!row) return null
  const own = (hazards ?? []).filter(h => h.region === region)
  return {
    deaths: row.deaths,
    crashes: row.crashes,
    hazards: own.length,
    withoutCoordinates: own.filter(h => h.lat === null || h.lon === null || !inBounds(h.lon, h.lat)).length
  }
}
