import { modelSlugCandidates } from './infocarLookup.js'

/**
 * Picks CarShow360 360° galleries (`registry.car_models_360`, see scripts/src/carshow360.ts) for a registry
 * (brand, model). Pure over the rows it is given. Matching reuses infocar's model-slug candidates (`CEE'D` -> `ceed`).
 * The year is deliberately ignored — every generation/trim gallery of the make/model is offered (the label names it,
 * e.g. "III FL2021 Hatchback") and the viewer picks. Newest first: a facelift year in the label (`FL2021`) wins, then
 * the gallery id (higher = added later = usually a newer generation).
 */
export type Model360LookupRow = {
  id: number
  brandSlug: string
  modelSlug: string
  label: string
}

export const MAX_MODELS_360 = 40

const faceliftYear = (label: string): number => Number(/\bFL(\d{4})\b/i.exec(label)?.[1] ?? 0)

export function model360Lookup<T extends Model360LookupRow>(
  rows: T[],
  brandSlug: string | null,
  model: string | null | undefined
): T[] {
  if (!brandSlug || !model?.trim()) return []
  const brandRows = rows.filter(r => r.brandSlug === brandSlug)
  const slugs = [...new Set(brandRows.map(r => r.modelSlug))]
  const wanted = modelSlugCandidates(brandSlug, model, slugs).find(s => slugs.includes(s))
  if (!wanted) return []
  return brandRows
    .filter(r => r.modelSlug === wanted)
    .sort((a, b) => faceliftYear(b.label) - faceliftYear(a.label) || b.id - a.id)
    .slice(0, MAX_MODELS_360)
}
