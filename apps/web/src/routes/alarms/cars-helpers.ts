import { regionMarker, spreadLogos } from '@/routes/stats/StatsMap.helpers'
import type { MapMode, MarkerLabels, PlacedLogo, RegionMarker, RegionMarkerData } from '@/routes/stats/StatsMap.helpers'

const MAP_WIDTH = 800
const MAP_HEIGHT = 520
/** Chip side in map units: the smallest region's, plus how much the fleet share (of the biggest region) adds. */
const CHIP_MIN = 14
const CHIP_GROW = 16
const LABEL_CLEARANCE = 5

type Entry = { value: string; n: number }
type BrandsEntry = { fleet: number; brands: { brand: string; n: number }[] }
type FacetsEntry = { fleet: number; models: Entry[]; fuels: Entry[]; origins: Entry[] }

/** Fleet numbers of one region for the region card (current passenger-car registrations). */
export type RegionFleetSummary = {
  fleet: number
  brands: { brand: string; n: number }[]
  topModel: Entry | null
  electric: number
  hybrid: number
  diesel: number
  topOrigin: Entry | null
}

const BRANDS_SHOWN = 3

/** Joins the two per-region rollups; null when neither has the region. */
export function fleetSummary(
  brands: BrandsEntry | undefined,
  facets: FacetsEntry | undefined
): RegionFleetSummary | null {
  if (!brands && !facets) return null
  const fuel = (cls: string): number => facets?.fuels.find(f => f.value === cls)?.n ?? 0
  return {
    fleet: brands?.fleet ?? facets?.fleet ?? 0,
    brands: (brands?.brands ?? []).slice(0, BRANDS_SHOWN),
    topModel: facets?.models[0] ?? null,
    electric: fuel('electric'),
    hybrid: fuel('hybrid'),
    diesel: fuel('diesel'),
    topOrigin: facets?.origins[0] ?? null
  }
}

export type MarkerChip = PlacedLogo & { marker: RegionMarker }

type MarkerSources = {
  brands: ReadonlyMap<string, BrandsEntry>
  facets: ReadonlyMap<string, FacetsEntry>
}

/**
 * One chip per region for a map mode, placed at the region centres (`centers`: plate-region name → x, y) and spread apart so
 * they do not overlap. Regions without data for the mode get no chip. The alarm fills are never touched.
 */
export function markerChips(
  mode: MapMode,
  centers: ReadonlyMap<string, readonly [number, number]>,
  sources: MarkerSources,
  labels: MarkerLabels,
  logoOf: (brand: string) => string | null,
  flagOf: (code: string) => string | null,
  locale: string
): MarkerChip[] {
  const dataOf = (region: string): RegionMarkerData | undefined => {
    if (mode === 'brand') {
      const entry = sources.brands.get(region)
      return entry && { fleet: entry.fleet, brands: entry.brands, models: [], fuels: [], origins: [] }
    }
    const entry = sources.facets.get(region)
    return entry && { fleet: entry.fleet, brands: [], models: entry.models, fuels: entry.fuels, origins: entry.origins }
  }
  const maxFleet = Math.max(1, ...[...sources.brands.values(), ...sources.facets.values()].map(r => r.fleet))

  const chips: (Omit<MarkerChip, 'x' | 'y' | 'displaced'> & { marker: RegionMarker })[] = []
  for (const [region, [cx, cy]] of centers) {
    const data = dataOf(region)
    const marker = data && regionMarker(mode, data, labels, logoOf, flagOf, locale)
    if (!data || !marker || (!marker.src && !marker.text) || !Number.isFinite(cx) || !Number.isFinite(cy)) continue
    const size = CHIP_MIN + CHIP_GROW * Math.sqrt(data.fleet / maxFleet)
    // Sit above the region name (drawn at the centre) instead of covering it.
    chips.push({ key: region, cx, cy: cy - size / 2 - LABEL_CLEARANCE, size, marker })
  }
  const markerByKey = new Map(chips.map(c => [c.key, c.marker]))
  return spreadLogos(chips, MAP_WIDTH, MAP_HEIGHT).flatMap(p => {
    const marker = markerByKey.get(p.key)
    return marker ? [{ ...p, marker }] : []
  })
}
