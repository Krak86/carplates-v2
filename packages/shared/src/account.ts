import { z } from 'zod'

/**
 * Account + paid-feature contract (Phase 5). Kept out of `schemas.ts` on purpose: none of these responses are
 * persisted for offline use, so changing them must not bust every user's offline cache (its buster hashes that file).
 */

/** Opt-in paid features a signed-in user can toggle on /features. Order = presentation order on that page. */
export const PAID_FEATURES = ['ria_ads', 'ria_avg_price', 'platesmania', 'auction_history'] as const
export type PaidFeature = (typeof PAID_FEATURES)[number]

/** `admin` is granted directly in the DB only (`UPDATE app.users SET role = 'admin' WHERE email = …`). */
export const USER_ROLES = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(USER_ROLES),
  createdAt: z.string()
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** `user: null` = anonymous — a 200, not a 401, so the header's session probe never logs an error. */
export const sessionResponseSchema = z.object({ user: sessionUserSchema.nullable() })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

/** `googleClientId: null` = the API has no GOOGLE_CLIENT_ID, sign-in is unavailable. */
export const authConfigResponseSchema = z.object({ googleClientId: z.string().nullable() })
export type AuthConfigResponse = z.infer<typeof authConfigResponseSchema>

/** The ID token (JWT) Google Identity Services hands the page after the user picks an account. */
export const googleSignInRequestSchema = z.object({ credential: z.string().min(20).max(4096) })
export type GoogleSignInRequest = z.infer<typeof googleSignInRequestSchema>

export const featureStateSchema = z.object({
  feature: z.enum(PAID_FEATURES),
  enabled: z.boolean(),
  updatedAt: z.string().nullable()
})
export type FeatureState = z.infer<typeof featureStateSchema>

/** Always one entry per PAID_FEATURES member, in that order (never-touched ones come back `enabled: false`). */
export const featuresResponseSchema = z.object({ features: z.array(featureStateSchema) })
export type FeaturesResponse = z.infer<typeof featuresResponseSchema>

export const featuresUpdateRequestSchema = z.object({
  features: z.array(z.object({ feature: z.enum(PAID_FEATURES), enabled: z.boolean() })).max(PAID_FEATURES.length)
})
export type FeaturesUpdateRequest = z.infer<typeof featuresUpdateRequestSchema>

export const adminUserSchema = sessionUserSchema.extend({
  lastLoginAt: z.string().nullable(),
  /** Features the user has switched on. */
  features: z.array(z.enum(PAID_FEATURES)),
  featuresUpdatedAt: z.string().nullable()
})
export type AdminUser = z.infer<typeof adminUserSchema>

export const adminUsersResponseSchema = z.object({ users: z.array(adminUserSchema) })
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>

/** Favorites / history cross-device sync. Each list is capped; past the cap the OLDEST entries are dropped. Nothing expires by age. */
export const FAVORITES_LIMIT = 100
export const HISTORY_LIMIT = 200
/** How long a deletion marker (tombstone) is kept so a device that was offline can still learn about it. */
export const SYNC_TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * One favorite / history entry on the wire. `date` is the last-write time (ms): the newer write of the same
 * `kind:value` wins a conflict on either side, and a `deleted` entry is a tombstone carrying its deletion time.
 */
export const syncEntrySchema = z.object({
  kind: z.enum(['plate', 'vin']),
  value: z.string().min(1).max(32),
  label: z.string().max(200).nullable(),
  date: z.number().int().positive(),
  found: z.boolean().optional(),
  deleted: z.boolean().optional()
})
export type SyncEntry = z.infer<typeof syncEntrySchema>

const SYNC_MAX_ENTRIES = 1000

export const syncRequestSchema = z.object({
  favorites: z.array(syncEntrySchema).max(SYNC_MAX_ENTRIES),
  history: z.array(syncEntrySchema).max(SYNC_MAX_ENTRIES)
})
export type SyncRequest = z.infer<typeof syncRequestSchema>

/** The merged server state (tombstones included) after applying the request, plus how many favorites the cap dropped. */
export const syncResponseSchema = z.object({
  favorites: z.array(syncEntrySchema),
  history: z.array(syncEntrySchema),
  evictedFavorites: z.number().int().min(0)
})
export type SyncResponse = z.infer<typeof syncResponseSchema>
