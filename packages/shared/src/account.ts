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
