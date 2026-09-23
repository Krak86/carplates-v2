import type { StatsResponse } from '@carplates/shared'

import { isKnownFuel } from '@/components/ResultCard.helpers'

import type { StatsDimension, StatsRow } from './types'

/**
 * Merges the fuel rollup's unknown/absent/garbage values ("NULL", "ВІДСУТНЄ", ".", a blank
 * value — see ResultCard.helpers.ts) into one "—" row, same as the ResultCard fuel popover.
 * `totalRows` sums exactly (count(*) is additive), but distinctPlates/distinctVins are each
 * already an exact COUNT(DISTINCT ...) *within* one fuel value, so summing them across the
 * merged values is an upper bound: a plate that wore more than one unknown spelling across
 * its registration history gets counted once per spelling. Good enough for this table —
 * an exact figure would need a dedicated rollup grouped by a normalized fuel expression.
 */
function fuelRows(stats: StatsResponse): StatsRow[] {
  const known = stats.byFuel.filter(r => isKnownFuel(r.value)).map(r => ({ ...r, label: r.value ?? '—', year: null }))
  const unknown = stats.byFuel.filter(r => !isKnownFuel(r.value))
  if (unknown.length === 0) return known
  return [
    ...known,
    {
      label: '—',
      year: null,
      totalRows: unknown.reduce((sum, r) => sum + r.totalRows, 0),
      distinctPlates: unknown.reduce((sum, r) => sum + r.distinctPlates, 0),
      distinctVins: unknown.reduce((sum, r) => sum + r.distinctVins, 0)
    }
  ]
}

/** Flattens whichever rollup `dim` selects into the one row shape the table renders. */
export function dimensionRows(stats: StatsResponse, dim: StatsDimension): StatsRow[] {
  switch (dim) {
    case 'year':
      return stats.byYear.map(r => ({ ...r, label: r.year === null ? '—' : String(r.year), year: r.year }))
    case 'region':
      return stats.byRegion.map(r => ({ ...r, label: r.region, year: null }))
    case 'regionYear':
      return stats.byRegionYear.map(r => ({ ...r, label: r.region, year: r.year }))
    case 'body':
      return stats.byBody.map(r => ({ ...r, label: r.value ?? '—', year: null }))
    case 'kind':
      return stats.byKind.map(r => ({ ...r, label: r.value ?? '—', year: null }))
    case 'color':
      return stats.byColor.map(r => ({ ...r, label: r.value ?? '—', year: null }))
    case 'fuel':
      return fuelRows(stats)
  }
}

/** Whether the flattened table for `dim` needs a separate, sortable Year column. */
export function dimensionHasYearColumn(dim: StatsDimension): boolean {
  return dim === 'regionYear'
}

/** The registration-year span the dataset actually covers, or `null` if `byYear` has no dated rows. */
export function yearRange(stats: StatsResponse): { min: number; max: number } | null {
  const years = stats.byYear.map(r => r.year).filter((y): y is number => y !== null)
  if (years.length === 0) return null
  return { min: Math.min(...years), max: Math.max(...years) }
}

/**
 * Human label for one end of the year range: just the year, or "Month Year"
 * when that end is the current calendar year — `byYear` has no month
 * breakdown, and the registry only updates monthly (see CLAUDE.md), so the
 * current year's total is never actually a full year yet.
 */
export function yearBoundaryLabel(year: number, locale: string, now: Date = new Date()): string {
  if (year !== now.getFullYear()) return String(year)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now)
}

// The dataviz skill's documented sequential-blue ramp (steps 100→700,
// references/palette.md) — light end recedes toward the surface, dark end
// reads as "most". Never hand-pick a hex outside this documented instance.
const SEQUENTIAL_BLUE_RAMP = [
  '#cde2fb',
  '#b7d3f6',
  '#9ec5f4',
  '#86b6ef',
  '#6da7ec',
  '#5598e7',
  '#3987e5',
  '#2a78d6',
  '#256abf',
  '#1c5cab',
  '#184f95',
  '#104281',
  '#0d366b'
] as const

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/**
 * A value's fill along the sequential ramp, `t` in [0, 1]. Dark mode flips
 * the anchor (palette.md: "flips anchor in dark") — otherwise the low end
 * would pop white-on-dark and the high end would vanish into the dark surface.
 */
export function choroplethColor(t: number, theme: 'light' | 'dark'): string {
  const clamped = Math.min(1, Math.max(0, t))
  const ramp = theme === 'dark' ? [...SEQUENTIAL_BLUE_RAMP].reverse() : SEQUENTIAL_BLUE_RAMP
  const scaled = clamped * (ramp.length - 1)
  const i = Math.min(ramp.length - 2, Math.floor(scaled))
  const lo = ramp[i]
  const hi = ramp[i + 1]
  if (!lo || !hi) return ramp[0] ?? '#cde2fb'
  const localT = scaled - i
  const [r1, g1, b1] = hexToRgb(lo)
  const [r2, g2, b2] = hexToRgb(hi)
  return `rgb(${lerp(r1, r2, localT)}, ${lerp(g1, g2, localT)}, ${lerp(b1, b2, localT)})`
}
