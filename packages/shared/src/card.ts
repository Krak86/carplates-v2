import { z } from 'zod'

import { fxResponseSchema } from './fx.js'
import { openEvResponseSchema } from './openEv.js'
import { rdwResponseSchema } from './rdw.js'
import { models360ResponseSchema, models3dResponseSchema, wikiImageResponseSchema } from './schemas.js'
import { vdbResponseSchema } from './vdb.js'

/**
 * GET /api/card/:plate — everything the top of a result card needs beyond the plate row itself, resolved server-side
 * from the plate (so the client can ask in parallel with the plate lookup instead of after it). Every part is exactly
 * what its own endpoint answers, and the web seeds those endpoints' query keys with it. A part is `null` when it is not
 * known locally (no year, not electric, no stored photo, no cached NBU rates): the client then fetches it as before.
 * Own file, not `schemas.ts`, so adding it does not bust offline caches.
 */
export const cardBundleResponseSchema = z.object({
  plate: z.string(),
  vdb: vdbResponseSchema.nullable().optional(),
  rdw: rdwResponseSchema.nullable().optional(),
  ev: openEvResponseSchema.nullable().optional(),
  models3d: models3dResponseSchema.nullable().optional(),
  models360: models360ResponseSchema.nullable().optional(),
  fx: fxResponseSchema.nullable().optional(),
  wikiImage: wikiImageResponseSchema.nullable().optional()
})
export type CardBundleResponse = z.infer<typeof cardBundleResponseSchema>
