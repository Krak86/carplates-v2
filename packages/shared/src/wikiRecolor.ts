import { z } from 'zod'

import { VEHICLE_COLORS } from './vehicleColor.js'

/**
 * GET /api/wiki/recolor?brand=&model=&year= - the paint scan of the stored hero photo (`registry.wiki_image_paint`), for the
 * client-side colour filter. `recolor` is null when the photo is not stored, not scanned yet, or the scan skipped it.
 * Own contract file (not `schemas.ts`), so a new field never discards saved offline data: new fields are `.nullable().optional()`.
 * The wrapper object exists because Nest answers a bare `null` with an empty body.
 */
export const wikiRecolorSchema = z.object({
  /** The photo this mask belongs to: the client applies the filter only when it equals the photo it shows. */
  imageUrl: z.string(),
  /** The photographed paint colour (nearest registry colour). */
  bucket: z.enum(VEHICLE_COLORS),
  /** CIE Lab of the paint cluster: the client decides `isClosePaint(lab, target)` at runtime. */
  lab: z.tuple([z.number(), z.number(), z.number()]),
  /** RGBA webp (RGB shading, A paint weight), same pixel grid as the photo's `object-fit: cover` box scaled to `w` x `h`. */
  maskUrl: z.string(),
  w: z.number().int(),
  h: z.number().int()
})
export type WikiRecolor = z.infer<typeof wikiRecolorSchema>

export const wikiRecolorResponseSchema = z.object({ recolor: wikiRecolorSchema.nullable() })
export type WikiRecolorResponse = z.infer<typeof wikiRecolorResponseSchema>
