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
  /** Null for Telegram-only accounts. */
  email: z.string().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(USER_ROLES),
  createdAt: z.string(),
  /** Set once the user asked to delete the account; signing in during the grace period restores it. */
  deletionScheduledAt: z.string().nullable().optional(),
  /** Opted in to the monthly "what's new" mail (off until the user switches it on). */
  marketingOptIn: z.boolean().optional()
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** `user: null` = anonymous — a 200, not a 401, so the header's session probe never logs an error. */
export const sessionResponseSchema = z.object({ user: sessionUserSchema.nullable() })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

/** `googleClientId` / `telegramBotUsername: null` = the API lacks that provider's env, so its sign-in is unavailable. */
export const authConfigResponseSchema = z.object({
  googleClientId: z.string().nullable(),
  telegramBotUsername: z.string().nullable(),
  /** Email code sign-in is always on; the flag lets a deployment without a mail transport hide it. */
  emailEnabled: z.boolean().optional(),
  /** Public Cloudflare Turnstile site key; null/absent = no challenge is required. */
  turnstileSiteKey: z.string().nullable().optional(),
  /** Days a deleted account can still be restored by signing in. */
  deletionGraceDays: z.number().optional()
})
export type AuthConfigResponse = z.infer<typeof authConfigResponseSchema>

export const marketingPreferenceRequestSchema = z.object({ optIn: z.boolean() })
export type MarketingPreferenceRequest = z.infer<typeof marketingPreferenceRequestSchema>

/** Body of the unsubscribe page's button: the signed token from the mail link. */
export const unsubscribeRequestSchema = z.object({ token: z.string().min(1).max(300) })
export type UnsubscribeRequest = z.infer<typeof unsubscribeRequestSchema>

/** Admin view of the next monthly digest (`GET /api/admin/digest`). */
export const adminDigestStatusSchema = z.object({
  /** `YYYY-MM` of the month the next digest covers. */
  period: z.string(),
  /** False when that month shipped no new feature: nothing would be sent. */
  hasContent: z.boolean(),
  features: z.number(),
  optedIn: z.number(),
  alreadySent: z.number(),
  /** `DIGEST_ENABLED` on the API. */
  enabled: z.boolean()
})
export type AdminDigestStatus = z.infer<typeof adminDigestStatusSchema>

export const adminDigestTestResponseSchema = z.object({ sentTo: z.string().nullable() })

export const EMAIL_CODE_LENGTH = 6
export const EMAIL_CHALLENGE_TTL_MINUTES = 15
/** Seconds the client must wait before asking for another code for the same address. */
export const EMAIL_RESEND_SECONDS = 60
export const UI_LANGS = ['ua', 'ru', 'en'] as const
export type UiLang = (typeof UI_LANGS)[number]

/** Lower-cased and trimmed, so one mailbox is one account. */
export const emailAddressSchema = z.string().trim().toLowerCase().max(254).pipe(z.email())

export const emailStartRequestSchema = z.object({
  email: emailAddressSchema,
  lang: z.enum(UI_LANGS).default('ua'),
  turnstileToken: z.string().max(4096).optional()
})
export type EmailStartRequest = z.infer<typeof emailStartRequestSchema>

/** Same body whether or not the address has an account (no enumeration). */
export const emailStartResponseSchema = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
  resendAfterSeconds: z.number()
})
export type EmailStartResponse = z.infer<typeof emailStartResponseSchema>

export const emailVerifyRequestSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`))
})
export type EmailVerifyRequest = z.infer<typeof emailVerifyRequestSchema>

export const emailLinkVerifyRequestSchema = z.object({ token: z.string().min(20).max(200) })
export type EmailLinkVerifyRequest = z.infer<typeof emailLinkVerifyRequestSchema>

/** Message of the 403 a sensitive endpoint answers when the session's last sign-in is older than SUDO_WINDOW_MINUTES. */
export const REAUTH_REQUIRED = 'REAUTH_REQUIRED'
export const SUDO_WINDOW_MINUTES = 10
/** Message of the 409 when a verified email already belongs to another account. */
export const EMAIL_IN_USE = 'EMAIL_IN_USE'

export const LINKABLE_PROVIDERS = ['google', 'telegram'] as const
export type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number]

/** How the signed-in user can currently get back into the account (email = the address on the account, if any). */
export const signInMethodsResponseSchema = z.object({
  email: z.string().nullable(),
  google: z.object({ email: z.string().nullable(), linkedAt: z.string() }).nullable(),
  telegram: z.object({ linkedAt: z.string() }).nullable()
})
export type SignInMethodsResponse = z.infer<typeof signInMethodsResponseSchema>

export const sessionInfoSchema = z.object({
  id: z.string(),
  /** e.g. "Chrome on Windows". */
  device: z.string(),
  method: z.string().nullable(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  current: z.boolean()
})
export type SessionInfo = z.infer<typeof sessionInfoSchema>

export const sessionsResponseSchema = z.object({ sessions: z.array(sessionInfoSchema) })
export type SessionsResponse = z.infer<typeof sessionsResponseSchema>

/** Re-authentication finished: the session counts as freshly signed in for SUDO_WINDOW_MINUTES. */
export const reauthResponseSchema = z.object({ authAt: z.string() })
export type ReauthResponse = z.infer<typeof reauthResponseSchema>

export const setEmailStartRequestSchema = z.object({ email: emailAddressSchema, lang: z.enum(UI_LANGS).default('ua') })
export type SetEmailStartRequest = z.infer<typeof setEmailStartRequestSchema>

export const reauthEmailStartRequestSchema = z.object({ lang: z.enum(UI_LANGS).default('ua') })
export type ReauthEmailStartRequest = z.infer<typeof reauthEmailStartRequestSchema>

/** The ID token (JWT) Google Identity Services hands the page after the user picks an account. */
export const googleSignInRequestSchema = z.object({ credential: z.string().min(20).max(4096) })
export type GoogleSignInRequest = z.infer<typeof googleSignInRequestSchema>

/** The Telegram Login Widget's signed user object, verbatim (every field is part of the signature). */
export const telegramSignInRequestSchema = z
  .record(z.string().max(64), z.union([z.string().max(1024), z.number()]))
  .refine(r => Object.keys(r).length <= 12, 'too many fields')
export type TelegramSignInRequest = z.infer<typeof telegramSignInRequestSchema>

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

/** What the first-party usage log counts (app.usage_events.kind). */
export const USAGE_KINDS = ['plate_search', 'vin_search', 'photo_search', 'login'] as const
export type UsageKind = (typeof USAGE_KINDS)[number]

export const adminStatsResponseSchema = z.object({
  totals: z.object({
    users: z.number(),
    newUsers7d: z.number(),
    activeUsers7d: z.number(),
    favorites: z.number()
  }),
  /** Per-kind counts for the last 1 / 7 / 30 days. */
  windows: z.array(z.object({ kind: z.enum(USAGE_KINDS), d1: z.number(), d7: z.number(), d30: z.number() })),
  /** Last 30 days, one row per UTC day (gaps filled with zeros), oldest first. */
  daily: z.array(z.object({ day: z.string(), searches: z.number(), notFound: z.number(), logins: z.number() })),
  /** Searches by UI language, last 30 days. */
  languages: z.array(z.object({ lang: z.string(), count: z.number() })),
  signedInSearches30d: z.number(),
  anonymousSearches30d: z.number(),
  featureOptIns: z.array(z.object({ feature: z.enum(PAID_FEATURES), users: z.number() }))
})
export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>

/** One sample of the host the API runs on. `at` is epoch ms. */
export const serverSampleSchema = z.object({
  at: z.number(),
  /** Whole-host CPU busy share since the previous sample, 0-100. */
  cpuPercent: z.number(),
  memUsedBytes: z.number(),
  /** The API process (RSS). */
  processRssBytes: z.number(),
  load1: z.number()
})
export type ServerSample = z.infer<typeof serverSampleSchema>

export const adminServerResponseSchema = z.object({
  cpuCores: z.number(),
  cpuModel: z.string(),
  memTotalBytes: z.number(),
  diskTotalBytes: z.number().nullable(),
  diskUsedBytes: z.number().nullable(),
  uptimeSeconds: z.number(),
  processUptimeSeconds: z.number(),
  load: z.tuple([z.number(), z.number(), z.number()]),
  nodeVersion: z.string(),
  platform: z.string(),
  users: z.number(),
  dbSizeBytes: z.number().nullable(),
  dbConnections: z.number().nullable(),
  /** Oldest first; kept in memory, so it restarts empty with the API. */
  samples: z.array(serverSampleSchema)
})
export type AdminServerResponse = z.infer<typeof adminServerResponseSchema>

/** PostHog numbers pulled server-side (HogQL). `configured: false` = no POSTHOG_PERSONAL_API_KEY / project id. */
export const adminAnalyticsResponseSchema = z.object({
  configured: z.boolean(),
  error: z.string().nullable(),
  pageviews7d: z.number().nullable(),
  visitors7d: z.number().nullable(),
  pageviews30d: z.number().nullable(),
  visitors30d: z.number().nullable(),
  topPaths: z.array(z.object({ path: z.string(), views: z.number() })),
  /** Dashboards of the connected services (only the ones the API has ids for). */
  links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() }))
})
export type AdminAnalyticsResponse = z.infer<typeof adminAnalyticsResponseSchema>

/** Favorites / history cross-device sync. Each list is capped; past the cap the OLDEST entries are dropped. Nothing expires by age. */
export const FAVORITES_LIMIT = 100
export const HISTORY_LIMIT = 200

/** A user may define this many favorite labels; each gets its own color (an index into the web palette). */
export const FAVORITE_LABEL_LIMIT = 10
export const FAVORITE_LABEL_COLOR_COUNT = FAVORITE_LABEL_LIMIT

export const favoriteLabelSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(24),
  color: z
    .number()
    .int()
    .min(0)
    .max(FAVORITE_LABEL_COLOR_COUNT - 1)
})
export type FavoriteLabel = z.infer<typeof favoriteLabelSchema>
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
  deleted: z.boolean().optional(),
  /** Favorites only: ids of the user's favorite labels (`userSettings.labels`) put on this entry. */
  tags: z.array(z.string().min(1).max(40)).max(FAVORITE_LABEL_LIMIT).optional()
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

/** Page-background layers (photos, map, three YouTube live streams). Order = presentation order in the layers panel. */
export const BACKGROUND_MODES = ['images', 'map', 'earth', 'traffic', 'city'] as const
export type BackgroundMode = (typeof BACKGROUND_MODES)[number]

/** Layers that play a YouTube live stream picked from a selector (the rest are photos / the map). */
export const STREAM_MODES = ['earth', 'traffic', 'city'] as const
export type StreamMode = (typeof STREAM_MODES)[number]

/** Tunables of the photo background — `ranges` mirror the sliders on /settings. */
export const backgroundSettingsSchema = z.object({
  photosEnabled: z.boolean(),
  blurEnabled: z.boolean(),
  blurPx: z.number().int().min(0).max(40),
  grayscaleEnabled: z.boolean(),
  grayscalePercent: z.number().int().min(0).max(100),
  brightnessEnabled: z.boolean(),
  brightnessPercent: z.number().int().min(20).max(150),
  overlayEnabled: z.boolean(),
  overlayOpacity: z.number().int().min(0).max(100),
  mouseParallaxEnabled: z.boolean(),
  mouseParallaxStrength: z.number().int().min(0).max(60),
  scrollParallaxEnabled: z.boolean(),
  scrollParallaxStrength: z.number().int().min(0).max(100),
  cycleEnabled: z.boolean(),
  cycleIntervalSec: z.number().int().min(3).max(60)
})
export type BackgroundSettings = z.infer<typeof backgroundSettingsSchema>

/** A user may keep this many named background presets. */
export const BACKGROUND_PRESET_LIMIT = 5

export const backgroundPresetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(40),
  settings: backgroundSettingsSchema
})
export type BackgroundPreset = z.infer<typeof backgroundPresetSchema>

/**
 * The signed-in user's preferences, stored as one JSON document (`app.user_settings.data`) and mirrored in
 * localStorage. New settings tabs add fields here; the whole document is last-write-wins by `updatedAt`.
 */
export const userSettingsSchema = z.object({
  /** Layer shown on load (the layers panel only changes it for the session). */
  defaultMode: z.enum(BACKGROUND_MODES),
  /** Live stream per stream layer — updated automatically when the user picks a stream in the layers panel. */
  streams: z.record(z.enum(STREAM_MODES), z.string().min(1).max(32)),
  presets: z.array(backgroundPresetSchema).max(BACKGROUND_PRESET_LIMIT),
  /** Preset in use; null = the built-in defaults. */
  activePresetId: z.string().max(40).nullable(),
  /** Use the built-in defaults even though presets exist (the active one is kept for later). */
  useDefaultBackground: z.boolean(),
  /** Favorite labels (≤ FAVORITE_LABEL_LIMIT). Defaulted so documents saved before labels existed still parse. */
  labels: z.array(favoriteLabelSchema).max(FAVORITE_LABEL_LIMIT).default([])
})
export type UserSettings = z.infer<typeof userSettingsSchema>

/** `updatedAt` is the last-edit time in ms (client clock, clamped by the API) — the newer document wins. */
export const settingsDocumentSchema = z.object({
  settings: userSettingsSchema,
  updatedAt: z.number().int().min(0)
})
export type SettingsDocument = z.infer<typeof settingsDocumentSchema>

/** `document: null` = nothing saved yet for this account. */
export const settingsResponseSchema = z.object({ document: settingsDocumentSchema.nullable() })
export type SettingsResponse = z.infer<typeof settingsResponseSchema>

export const settingsUpdateRequestSchema = settingsDocumentSchema
export type SettingsUpdateRequest = SettingsDocument

/** Operator dashboard links, served to admins only so the vendor list is not in the public JS bundle. */
export const adminLinksResponseSchema = z.object({
  links: z.array(z.object({ label: z.string(), href: z.string(), icon: z.string() }))
})
export type AdminLinksResponse = z.infer<typeof adminLinksResponseSchema>
