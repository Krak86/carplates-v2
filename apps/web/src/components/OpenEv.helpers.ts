import type { OpenEvVariant } from '@carplates/shared'

/** Connector names as owners know them; an unknown id from a newer file is shown as written. */
const PORT_LABELS: Readonly<Record<string, string>> = {
  type1: 'Type 1',
  type2: 'Type 2',
  ccs: 'CCS',
  chademo: 'CHAdeMO',
  tesla_ccs: 'Tesla (CCS)',
  tesla_suc: 'Tesla Supercharger'
}

export function formatPorts(ports: readonly string[]): string {
  return ports.map(p => PORT_LABELS[p] ?? p).join(', ')
}

/** "11 kW", "7.4 kW": one decimal only when there is a fraction. */
export function formatKw(kw: number): string {
  return `${Number.isInteger(kw) ? kw : kw.toFixed(1)} kW`
}

/**
 * Index of the variant whose release year is closest to the car's model year (ties → the earlier one); null when the
 * model has a single variant or none of them records a year — then nothing is singled out.
 */
export function closestVariantIndex(
  variants: readonly Pick<OpenEvVariant, 'releaseYear'>[],
  year: number | null
): number | null {
  if (!year || variants.length < 2) return null
  let best: number | null = null
  let bestGap = Infinity
  variants.forEach((v, i) => {
    if (v.releaseYear == null) return
    const gap = Math.abs(v.releaseYear - year)
    if (gap < bestGap) {
      best = i
      bestGap = gap
    }
  })
  return best
}

/** Window event the basic-data "electric" link fires so an already mounted Electric block opens and scrolls into view. */
export const OPEN_ELECTRIC_EVENT = 'carplates:open-electric'
