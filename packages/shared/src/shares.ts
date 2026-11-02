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
/** Largest accepted upload (the client's `shrinkImage` file is ~2.5 MB). */
export const SHARE_MAX_UPLOAD_BYTES = 3 * 1024 * 1024

/** Error messages the web maps to its own text (status in brackets). */
export const SHARE_LIMIT_REACHED = 'SHARE_LIMIT_REACHED' // 409: delete an old share first
export const SHARE_NO_PLATE = 'SHARE_NO_PLATE' // 422: the server found no plate in the photo
export const SHARING_UNAVAILABLE = 'SHARING_UNAVAILABLE' // 503: not configured, or the storage guard is reached
export const SHARE_EXPIRED = 'SHARE_EXPIRED' // 410: expired, deleted or never existed

/** 128 random bits as base64url. */
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/)

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
  token: shareTokenSchema
})
export type CreateShareResponse = z.infer<typeof createShareResponseSchema>

export const myShareSchema = z.object({
  id: z.uuid(),
  plate: z.string(),
  createdAt: z.string(),
  expiresAt: z.string()
})
export type MyShare = z.infer<typeof myShareSchema>

/** GET /api/shares - the signed-in user's active shares. */
export const mySharesResponseSchema = z.object({ shares: z.array(myShareSchema), max: z.number().int() })
export type MySharesResponse = z.infer<typeof mySharesResponseSchema>
