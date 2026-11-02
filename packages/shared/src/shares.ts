import { z } from 'zod'

import { plateCandidateSchema } from './schemas.js'

/**
 * Shareable photo-search links (PLAN.md "Shareable photo-search links"). Own file, not `schemas.ts`: none of these
 * responses are cached offline, so changing them must not bust the offline cache.
 */

/** Fixed retention of a shared photo; not editable by the user. */
export const SHARE_TTL_DAYS = 7
/** Active (not expired, not deleted) shares per user. */
export const SHARE_MAX_ACTIVE = 3
/** Active shares an admin may hold (testing and takedown work). */
export const SHARE_MAX_ACTIVE_ADMIN = 50
/** The per-user cap: admins get `SHARE_MAX_ACTIVE_ADMIN`, everyone else `SHARE_MAX_ACTIVE`. */
export function shareMaxActive(role: string | undefined): number {
  return role === 'admin' ? SHARE_MAX_ACTIVE_ADMIN : SHARE_MAX_ACTIVE
}
/** Largest accepted upload (the client's `shrinkImage` file is ~2.5 MB). */
export const SHARE_MAX_UPLOAD_BYTES = 3 * 1024 * 1024

/** Error messages the web maps to its own text (status in brackets). */
export const SHARE_LIMIT_REACHED = 'SHARE_LIMIT_REACHED' // 409: delete an old share first
export const SHARE_NO_PLATE = 'SHARE_NO_PLATE' // 422: the server found no plate in the photo
export const SHARING_UNAVAILABLE = 'SHARING_UNAVAILABLE' // 503: not configured, or the storage guard is reached
export const SHARE_EXPIRED = 'SHARE_EXPIRED' // 410: expired, deleted or never existed

/** 128 random bits as base64url. */
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/)

/** Pixel size of an image. */
export const shareSizeSchema = z.object({ width: z.number().int(), height: z.number().int() })

/**
 * What the shared copy lost versus the uploaded photo, so the user sees it before sharing. Always also true (not stored):
 * EXIF / GPS / camera / time metadata and the file name are gone, the copy is re-encoded.
 */
export const shareRemovedSchema = z.object({
  facesBlurred: z.number().int().nonnegative(),
  /** Size of the upload and of the stored copy; null when it could not be read. */
  originalSize: shareSizeSchema.nullable(),
  storedSize: shareSizeSchema.nullable()
})
export type ShareRemoved = z.infer<typeof shareRemovedSchema>

/** GET /api/shares/:token - what the viewer needs to fill the photo state without re-recognizing. */
export const shareMetaResponseSchema = z.object({
  plate: z.string(),
  /** The server's own reads; boxes are 0-1 fractions, so they line up with the stored (downscaled) copy. */
  candidates: z.array(plateCandidateSchema).min(1),
  expiresAt: z.string()
})
export type ShareMetaResponse = z.infer<typeof shareMetaResponseSchema>

/** POST /api/shares - the token is returned once, only its SHA-256 is stored. */
export const createShareResponseSchema = shareMetaResponseSchema.extend({
  id: z.uuid(),
  token: shareTokenSchema,
  removed: shareRemovedSchema.nullable().optional()
})
export type CreateShareResponse = z.infer<typeof createShareResponseSchema>

export const myShareSchema = z.object({
  id: z.uuid(),
  plate: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  removed: shareRemovedSchema.nullable().optional(),
  /** The plate reads with their boxes, for the outlines on the zoomed photo (owner only). */
  candidates: z.array(plateCandidateSchema).optional()
})
export type MyShare = z.infer<typeof myShareSchema>

/** GET /api/shares - the signed-in user's active shares. */
export const mySharesResponseSchema = z.object({ shares: z.array(myShareSchema), max: z.number().int() })
export type MySharesResponse = z.infer<typeof mySharesResponseSchema>

/** The unblurred upload is kept only this long for the blur editor; the dialog deletes it on confirm / cancel (hourly sweep as backstop). */
export const SHARE_ORIGINAL_TTL_MINUTES = 60
export const SHARE_NO_ORIGINAL = 'SHARE_NO_ORIGINAL' // 409: the unblurred upload is gone (confirmed or swept), the blur can no longer be edited

/** Brush limits of the manual blur editor (also enforced by the server). */
export const SHARE_RETOUCH_MAX_STROKES = 300
export const SHARE_RETOUCH_MAX_POINTS = 20_000
export const SHARE_BRUSH_MIN = 0.005
export const SHARE_BRUSH_MAX = 0.15

/** Fractions 0-1 of the photo, so a stroke lines up with the stored (downscaled) copy and the original alike. */
const unit = z.number().min(0).max(1)

/** One brush stroke: a polyline of 0-1 points; `radius` is a fraction of the photo's longer side. */
export const retouchStrokeSchema = z.object({
  mode: z.enum(['add', 'erase']),
  radius: z.number().min(SHARE_BRUSH_MIN).max(SHARE_BRUSH_MAX),
  points: z
    .array(z.tuple([unit, unit]))
    .min(1)
    .max(2000)
})
export type RetouchStroke = z.infer<typeof retouchStrokeSchema>

/**
 * POST /api/shares/:id/retouch - every stroke so far, in order (the server always re-renders from the unblurred upload:
 * auto face blur, then "add" strokes blur and "erase" strokes restore). A flattened image from the client is never accepted.
 */
export const retouchShareRequestSchema = z.object({
  strokes: z
    .array(retouchStrokeSchema)
    .max(SHARE_RETOUCH_MAX_STROKES)
    .refine(list => list.reduce((n, s) => n + s.points.length, 0) <= SHARE_RETOUCH_MAX_POINTS, 'Too many points')
})
export type RetouchShareRequest = z.infer<typeof retouchShareRequestSchema>

export const retouchShareResponseSchema = z.object({ removed: shareRemovedSchema.nullable() })
export type RetouchShareResponse = z.infer<typeof retouchShareResponseSchema>
