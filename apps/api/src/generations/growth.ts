import { RDW_MIN_DISPLAY_N } from '@carplates/shared'
import type { Generation, GenerationGrowthItem } from '@carplates/shared'

/** One `rdw_specs` model-year: medians in cm (RDW) with the number of vehicles behind each. */
export type RdwYearSizes = {
  modelYear: number
  lengthCm: number | null
  lengthN: number | null
  widthCm: number | null
  widthN: number | null
  wheelbaseCm: number | null
}

/** One `model_spec_wiki` generation: millimetres, keyed by the generation's first year. */
export type WikiGenerationSizes = {
  yearFrom: number
  lengthMm: number | null
  widthMm: number | null
  wheelbaseMm: number | null
}

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** Median of the well-sampled years; when none is well sampled, of every year that has a figure (same rule as the size rollup). */
function typicalCm(
  rows: readonly RdwYearSizes[],
  pick: (r: RdwYearSizes) => { cm: number | null; n: number | null }
): number | null {
  const present = rows.map(pick).filter((p): p is { cm: number; n: number | null } => p.cm != null && p.cm > 0)
  const sampled = present.filter(p => (p.n ?? 0) >= RDW_MIN_DISPLAY_N)
  return median((sampled.length > 0 ? sampled : present).map(p => p.cm))
}

const toMm = (cm: number | null): number | null => (cm == null ? null : Math.round(cm * 10))

/**
 * Typical size of each generation. A generation owns the model years from its first year up to the year before the next one
 * starts (two generations share a boundary year), so a facelift year is never counted twice. RDW year-medians come first,
 * Wikipedia's catalogue figures fill what RDW lacks.
 */
export function generationGrowth(
  generations: readonly Generation[],
  rdwYears: readonly RdwYearSizes[],
  wiki: readonly WikiGenerationSizes[]
): GenerationGrowthItem[] {
  return generations.map((g, i) => {
    const nextFrom = generations[i + 1]?.yearFrom ?? null
    const lastYear = Math.min(g.yearTo ?? Infinity, nextFrom != null ? nextFrom - 1 : Infinity)
    const years = rdwYears.filter(r => r.modelYear >= g.yearFrom && r.modelYear <= lastYear)
    const w = wiki.find(row => row.yearFrom === g.yearFrom)

    return {
      code: g.code,
      label: g.label,
      yearFrom: g.yearFrom,
      yearTo: g.yearTo,
      lengthMm: toMm(typicalCm(years, r => ({ cm: r.lengthCm, n: r.lengthN }))) ?? w?.lengthMm ?? null,
      widthMm: toMm(typicalCm(years, r => ({ cm: r.widthCm, n: r.widthN }))) ?? w?.widthMm ?? null,
      wheelbaseMm:
        toMm(median(years.map(r => r.wheelbaseCm).filter((v): v is number => v != null && v > 0))) ??
        w?.wheelbaseMm ??
        null
    }
  })
}
