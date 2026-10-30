import { registryLabel } from '@carplates/shared'
import type { RegistryLabelKind } from '@carplates/shared'

type Counts = readonly (readonly [string, number])[]
type Span = { yearFrom: number; yearTo: number | null }

/** A year needs this share of the model's cars to get a chip (the rest are registry noise and one-off imports). */
const YEAR_MIN_SHARE = 0.01
const MAX_YEAR_CHIPS = 24
/** Fuel and body variants: the biggest few that are not a sliver of the fleet. */
const OPTION_MIN_SHARE = 0.03
const MAX_OPTIONS = 4

/** The model years that get a chip, oldest first. Never empty when the model has any year. */
export function variantYears(years: Counts, total: number): number[] {
  const kept = years.filter(([, n]) => n >= total * YEAR_MIN_SHARE)
  const biggest = [...(kept.length > 0 ? kept : years)].sort((a, b) => b[1] - a[1]).slice(0, MAX_YEAR_CHIPS)
  return biggest.map(([y]) => Number(y)).sort((a, b) => a - b)
}

/** The generation that contains `year` (the newest when a boundary year fits two), or null. */
export function generationOfYear<G extends Span>(generations: readonly G[], year: number | null): G | null {
  if (year === null) return null
  let best: G | null = null
  for (const g of generations) {
    if (year >= g.yearFrom && year <= (g.yearTo ?? Infinity) && (!best || g.yearFrom > best.yearFrom)) best = g
  }
  return best
}

/** The year to show when a generation is picked: the one with the most registry cars inside its span, else its first year. */
export function yearInSpan(years: Counts, span: Span): number {
  let best: [number, number] | null = null
  for (const [y, n] of years) {
    const year = Number(y)
    if (year >= span.yearFrom && year <= (span.yearTo ?? Infinity) && (!best || n > best[1])) best = [year, n]
  }
  return best ? best[0] : span.yearFrom
}

export type VariantOption = { value: string; label: string }

/**
 * Fuel or body chips from the registry rows: `value` is the raw registry word (what the sections look it up by), `label` its
 * localized form. Words that read the same after localizing (`СЕДАН` / `СЕДАН-B`) collapse into the biggest one.
 */
export function variantOptions(kind: RegistryLabelKind, rows: Counts, total: number, lang: string): VariantOption[] {
  const seen = new Set<string>()
  const options: VariantOption[] = []
  for (const [value, n] of [...rows].sort((a, b) => b[1] - a[1])) {
    const label = registryLabel(kind, value, lang)
    if (seen.has(label) || label.length < 2 || label === 'null' || n < total * OPTION_MIN_SHARE) continue
    seen.add(label)
    options.push({ value, label })
    if (options.length === MAX_OPTIONS) break
  }
  return options
}
