import { z } from 'zod'

import { VEHICLE_COLORS } from './vehicleColor.js'

/**
 * GET /api/wiki/photos?brand=&model=&year=&color= - extra Wikimedia Commons photos of the model (`registry.wiki_image_candidate`),
 * best first: a photo whose real paint already matches `color`, then the right generation, then the quality rank. The files stay
 * hotlinked (like the hero photo). `photos` is empty when the model has not been scanned or nothing qualified.
 * Own contract file (not `schemas.ts`), so a new field never discards saved offline data: new fields are `.nullable().optional()`.
 */
export const wikiPhotoSchema = z.object({
  /** Commons thumbnail (1280 px wide). */
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  /** Commons file title, e.g. `File:2019 Kia Ceed front.jpg`: the credit links to its description page. */
  title: z.string(),
  /** Model year read from the file title; null when the title carries none. */
  year: z.number().int().nullable(),
  /** The photographed paint colour (nearest registry colour). */
  bucket: z.enum(VEHICLE_COLORS).nullable(),
  /** The paint already matches the requested `color` (so no colour filter is needed). Always false without a `color`. */
  colorMatch: z.boolean(),
  attribution: z
    .object({
      author: z.string().nullable(),
      license: z.string().nullable(),
      licenseUrl: z.string().nullable()
    })
    .nullable()
})
export type WikiPhoto = z.infer<typeof wikiPhotoSchema>

export const wikiPhotosResponseSchema = z.object({ photos: z.array(wikiPhotoSchema) })
export type WikiPhotosResponse = z.infer<typeof wikiPhotosResponseSchema>

/** Most photos the endpoint returns (the strip shows a few and a "show more"). */
export const WIKI_PHOTOS_MAX = 12
