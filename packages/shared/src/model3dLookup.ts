import { modelSlugCandidates } from './infocarLookup.js'

/**
 * Picks Sketchfab 3D models (`registry.car_models_3d`, see scripts/src/sketchfab.ts) for a registry (brand, model).
 * Pure over the rows it is given. Matching reuses infocar's model-slug candidates (`CEE'D` -> `ceed`). The year is
 * deliberately ignored: community models rarely map onto a registry year, so a make/model's whole set is offered and the
 * viewer picks. Most-liked first.
 */
export type Model3dLookupRow = {
  uid: string
  brandSlug: string
  modelSlug: string
  likeCount: number
}

export const MAX_MODELS_3D = 24

export function model3dLookup<T extends Model3dLookupRow>(
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
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, MAX_MODELS_3D)
}
