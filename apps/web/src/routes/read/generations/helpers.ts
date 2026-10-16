import { generationSpan, type GenerationGrowthItem } from '@carplates/shared'

/** A generation with at least one figure to show (the oldest generations of a model often have none). */
export const hasSize = (g: GenerationGrowthItem): boolean => !!(g.lengthMm || g.widthMm || g.wheelbaseMm)

/** "Typ NX", or the label ("Second generation") when the source names no code. */
export const generationName = (g: Pick<GenerationGrowthItem, 'code' | 'label'>): string => g.code || g.label

export const generationYears = (g: GenerationGrowthItem): string => generationSpan(g)

export type Growth = {
  from: GenerationGrowthItem
  to: GenerationGrowthItem
  lengthDeltaMm: number
  lengthPct: number
  /** Wheelbase change between the same two generations; null when either has no wheelbase. */
  wheelbaseDeltaMm: number | null
}

/**
 * How much the model grew: the oldest to the newest generation that has a length. Null when fewer than two generations
 * do, or the newest is not longer (a model that shrank is not a growth story — the table still shows it).
 */
export function growthSummary(generations: readonly GenerationGrowthItem[]): Growth | null {
  const measured = generations.filter(g => !!g.lengthMm)
  const from = measured[0]
  const to = measured[measured.length - 1]
  if (!from?.lengthMm || !to?.lengthMm || from === to || to.lengthMm <= from.lengthMm) return null

  const lengthDeltaMm = to.lengthMm - from.lengthMm
  return {
    from,
    to,
    lengthDeltaMm,
    lengthPct: Math.round((lengthDeltaMm / from.lengthMm) * 100),
    wheelbaseDeltaMm: from.wheelbaseMm && to.wheelbaseMm ? to.wheelbaseMm - from.wheelbaseMm : null
  }
}

/** Bar width in percent of the longest generation; 0 when the generation has no length. */
export const barPercent = (lengthMm: number | null | undefined, maxMm: number): number =>
  lengthMm && maxMm > 0 ? Math.round((lengthMm / maxMm) * 100) : 0

/** Centimetres, one decimal only when it is not a round number: 180 mm → "18", 175 mm → "17.5". */
export const mmToCm = (mm: number): string => String(Number((mm / 10).toFixed(1)))
