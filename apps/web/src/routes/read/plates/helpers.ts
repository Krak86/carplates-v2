import { LEGACY_REGIONS, normalizePlate, PLATE_SERIES, REGIONS } from '@carplates/shared'
import type { PlateSeries } from '@carplates/shared'

export type RegionRow = {
  /** Registry spelling of the region (also the `?region=` value of the advanced search). */
  region: string
  /** Letter pairs that were issued for it, in table order. */
  pairs: string[]
  /** Two-digit codes of the pre-2004 plates ("11АА1234"). */
  legacy: string[]
}

/** Every region with its letter pairs and legacy codes, built from the shared tables (never hand-copied), in table order. */
export function regionRows(): RegionRow[] {
  const rows = new Map<string, RegionRow>()
  const row = (region: string): RegionRow => {
    const existing = rows.get(region)
    if (existing) return existing
    const created: RegionRow = { region, pairs: [], legacy: [] }
    rows.set(region, created)
    return created
  }
  for (const [pair, region] of Object.entries(REGIONS)) row(region).pairs.push(pair)
  for (const [code, region] of Object.entries(LEGACY_REGIONS)) row(region).legacy.push(code)
  return [...rows.values()]
}

export type PrefixLookup =
  | { kind: 'region'; region: string; prefix: string; legacy: boolean }
  | { kind: 'service'; series: PlateSeries; prefix: string }
  | { kind: 'unknown'; prefix: string }
  | null

/** What the first two characters of a typed plate (any script) say: a region, an online-service series, or nothing known. */
export function lookupPrefix(input: string): PrefixLookup {
  const prefix = normalizePlate(input).slice(0, 2)
  if (prefix.length < 2) return null
  const series = (PLATE_SERIES as Readonly<Record<string, PlateSeries>>)[prefix]
  if (series) return { kind: 'service', series, prefix }
  const current = REGIONS[prefix]
  if (current) return { kind: 'region', region: current, prefix, legacy: false }
  const legacy = LEGACY_REGIONS[prefix]
  if (legacy) return { kind: 'region', region: legacy, prefix, legacy: true }
  return { kind: 'unknown', prefix }
}
