import { makeKey, modelKey } from '@carplates/shared'
import type { VdbModelInsert } from '@carplates/db'
import { z } from 'zod'

/** One `dist/vehicles.csv` record. The list columns are `|`-separated; the decile can be empty. */
const rowSchema = z.object({
  kind: z.string().trim().min(1),
  make_slug: z.string().trim().min(1),
  make_name: z.string().trim().min(1),
  model_slug: z.string().trim().min(1),
  model_name: z.string().trim().min(1),
  body_types: z.string().default(''),
  countries: z.string().default(''),
  regions: z.string().default(''),
  global_popularity_decile: z.string().default(''),
  aliases: z.string().default(''),
  former_ids: z.string().default('')
})

export const splitList = (v: string): string[] =>
  v
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)

/** Deciles run 1..10; anything else (empty, junk) is "not ranked". */
export function parseDecile(v: string): number | null {
  const n = Number(v)
  return v.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 10 ? n : null
}

/** One VehiclesDB CSV record (header-name keyed) → a normalized row, or null if unusable. */
export function parseVehiclesDbRow(rec: Record<string, string>): VdbModelInsert | null {
  const parsed = rowSchema.safeParse(rec)
  if (!parsed.success) return null
  const r = parsed.data
  const mk = makeKey(r.make_name) ?? makeKey(r.make_slug)
  const mdk = modelKey(r.model_name) ?? modelKey(r.model_slug)
  if (!mk || !mdk) return null
  return {
    id: `${r.kind}:${r.make_slug}:${r.model_slug}`,
    kind: r.kind,
    makeSlug: r.make_slug,
    makeName: r.make_name,
    modelSlug: r.model_slug,
    modelName: r.model_name,
    makeKey: mk,
    modelKey: mdk,
    bodyTypes: splitList(r.body_types),
    countries: splitList(r.countries),
    regions: splitList(r.regions),
    globalDecile: parseDecile(r.global_popularity_decile),
    aliases: splitList(r.aliases),
    formerIds: splitList(r.former_ids)
  }
}
