import { PROZORRO_DOC_ID_RE } from '@carplates/shared'
import { z } from 'zod'

/** Widths the resizer serves (CSS px of a thumbnail, a detail view, a full-screen view). Anything else is a 400, so the edge cache holds three variants per photo. */
export const PHOTO_WIDTHS = [320, 960, 1600] as const
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number]
export const DEFAULT_PHOTO_WIDTH: PhotoWidth = 320

/** `:docId` is the 32-hex Prozorro document id and nothing else: the upstream host is fixed, never taken from input. */
export const photoParamSchema = z.object({
  docId: z.string().regex(PROZORRO_DOC_ID_RE, 'docId must be 32 hex characters')
})

/** `?w=`: one of `PHOTO_WIDTHS`. */
export const photoQuerySchema = z.object({
  w: z.coerce
    .number()
    .int()
    .refine(w => (PHOTO_WIDTHS as readonly number[]).includes(w), `w must be one of ${PHOTO_WIDTHS.join(', ')}`)
    .default(DEFAULT_PHOTO_WIDTH)
})
