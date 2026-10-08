import type { Winner360Insert } from '@carplates/db'
import { infocarBrandSlug, winner360ModelSlug } from '@carplates/shared'
import { z } from 'zod'

/** Pure parsing of stock.winner.ua's card JSON (see winner360.ts). */

const FUELS: Readonly<Record<string, string>> = { P: 'petrol', D: 'diesel', H: 'hybrid', E: 'electric' }

const cardSchema = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.coerce.number().int().optional(),
  version: z.string().optional(),
  fuel: z.string().optional(),
  photo_360: z.string().optional(),
  photo_recid: z.coerce.number().int().optional()
})

/** Cards with a 360 photo -> rows; one row per `photo_recid`. Cards whose brand has no slug are skipped and counted. */
export function parseCards(json: unknown): { rows: Winner360Insert[]; skipped: number } {
  const byRecid = new Map<number, Winner360Insert>()
  let skipped = 0
  for (const raw of z.array(z.unknown()).parse(json)) {
    const card = cardSchema.safeParse(raw)
    if (!card.success) continue
    const c = card.data
    const photoUrl = c.photo_360
    const photoRecid = c.photo_recid
    if (!photoUrl || !photoRecid) continue
    const brandSlug = infocarBrandSlug(c.brand)
    const modelSlug = winner360ModelSlug(c.model)
    if (!brandSlug || !modelSlug) {
      skipped++
      continue
    }
    byRecid.set(photoRecid, {
      photoRecid,
      brandSlug,
      modelSlug,
      brand: c.brand,
      model: c.model,
      year: c.year ?? null,
      version: c.version?.trim() || null,
      fuel: (c.fuel && FUELS[c.fuel]) || null,
      photoUrl
    })
  }
  return { rows: [...byRecid.values()], skipped }
}
