import { z } from 'zod'

const boolish = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform(v => v === 'true' || v === '1')

const DEV_DB_CREDENTIALS = 'carplates:carplates@'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Dev default only; production refuses to boot with it (see `assertProductionEnv`). */
  DATABASE_URL: z.string().default(`postgres://${DEV_DB_CREDENTIALS}localhost:5432/carplates`),

  /** Absolute or relative path to the built web app; unset in dev (Vite serves it). */
  WEB_DIST_DIR: z.string().optional(),
  PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),

  NHTSA_BASE_URL: z.string().default('https://vpic.nhtsa.dot.gov/api/vehicles'),
  /** Separate host from vPIC decoding above — NHTSA's 5-star crash test ratings API, US-market vehicles only. */
  NHTSA_SAFETY_RATINGS_BASE_URL: z.string().default('https://api.nhtsa.gov'),

  PLATE_RECOGNIZER_CLOUD_URL: z.string().default('https://api.platerecognizer.com/v1/plate-reader/'),
  /** Absent → the cloud recognize route answers 503. */
  PLATE_RECOGNIZER_CLOUD_TOKEN: z.string().optional(),
  /** Soft ceiling on cloud lookups per calendar month, to stay under the free-tier cap with headroom. */
  PLATE_RECOGNIZER_MONTHLY_BUDGET: z.coerce.number().int().positive().default(2000),
  /** Global opt-in for the paid cloud fallback — off by default even with a token set; must be explicitly enabled. */
  PLATE_RECOGNIZER_CLOUD_ENABLED: boolish,

  /** Own-model ALPR container (services/alpr, `pnpm alpr:up`). Absent → the local recognize route answers 503. */
  ALPR_LOCAL_URL: z.string().optional(),

  /** AUTO.RIA's free "check a car" answer, the fallback for plates our registry lacks (pre-2013). Unofficial, undocumented
   *  endpoint capped at 5 calls / 90 s per IP, so it is opt-in: off unless explicitly enabled. */
  RIA_CHECK_ENABLED: boolish,
  RIA_CHECK_BASE_URL: z.string().default('https://auto.ria.com'),

  PIXABAY_BASE_URL: z.string().default('https://pixabay.com/api/'),
  /** Absent → the photos route answers 503. */
  PIXABAY_API_KEY: z.string().optional(),

  /** Default hero-image strategy for /api/wiki (a request's `?source=` overrides it, for A/B comparison).
   *  `commons` = year-aware Wikimedia Commons file search, falling back to the article lead image;
   *  `wiki` = the article lead image only (always the newest generation). */
  WIKI_IMAGE_SOURCE: z.enum(['commons', 'wiki']).default('commons'),

  /** OAuth 2.0 Web client id from Google Cloud Console (Credentials). Absent → sign-in is unavailable
   *  (`GET /api/auth/config` answers `googleClientId: null`, `POST /api/auth/google` 503). Not a secret. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  /** Telegram Login Widget: bot token from @BotFather (**secret**, verifies the signature) + the bot's public username
   *  (no `@`). Both needed, else Telegram sign-in is unavailable (`telegramBotUsername: null`, `POST /api/auth/telegram` 503).
   *  The site domain must be set with BotFather `/setdomain` (https only — test through a tunnel). */
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  /** Server secret (≥ 32 chars) keying the HMAC of email sign-in codes. Required in production; dev falls back to a fixed value. */
  AUTH_SECRET: z.string().min(32).optional(),
  /** Transactional mail transport: `log` (dev default, prints to the API log), `smtp` (Mailpit / any provider) or `resend`. */
  MAIL_TRANSPORT: z.enum(['log', 'smtp', 'resend']).default('log'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_URL: z.string().default('smtp://localhost:1025'),
  MAIL_FROM: z.string().default('carsua.app <no-reply@localhost>'),
  MAIL_REPLY_TO: z.string().optional(),
  /** Cloudflare Turnstile on "send code". Site key is public; absent secret → the check is skipped (dev). */
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  /** Days a deleted account can still be restored by signing in before it is purged. */
  ACCOUNT_DELETION_GRACE_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  /** Session cookie lifetime; each request in the second half of it extends the session again (sliding). */
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** Admin Statistics tab: live PostHog numbers via the HogQL query API. Needs a *personal* API key (scope: query:read),
   *  not the public project key the web app uses. Absent → the tab shows only first-party counts + dashboard links. */
  POSTHOG_PERSONAL_API_KEY: z.string().optional(),
  POSTHOG_PROJECT_ID: z.string().optional(),
  /** Use https://us.posthog.com for a US-cloud project. */
  POSTHOG_API_HOST: z.string().default('https://eu.posthog.com'),
  /** Sentry organization slug — only used to build the dashboard link on the admin Statistics tab. */
  SENTRY_ORG_SLUG: z.string().optional(),

  /** Set when running behind a reverse proxy (Caddy/Cloudflare) so per-IP rate limits see the client IP from
   *  X-Forwarded-For, not the proxy's. Leave off when the API is exposed directly — the header would be spoofable. */
  TRUST_PROXY: boolish,

  /** Swagger UI at /api/docs — off in production unless explicitly enabled. */
  ENABLE_SWAGGER: boolish,

  /** Telemetry is inert unless BOTH the flag is set AND the DSN is present. */
  ENABLE_TELEMETRY: boolish,
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  GIT_SHA: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment:\n${issues}`)
  }
  assertProductionEnv(parsed.data)
  cached = parsed.data
  return cached
}

/** Refuses to boot a misconfigured production: dev CORS reflects any origin, and email codes need a real HMAC key. */
function assertProductionEnv(env: Env): void {
  if (env.NODE_ENV !== 'production') return
  const problems: string[] = []
  if (!env.AUTH_SECRET) problems.push('AUTH_SECRET is required')
  if (env.DATABASE_URL.includes(DEV_DB_CREDENTIALS))
    problems.push('DATABASE_URL is required and must not use the dev credentials')
  if (/localhost|127\.0\.0\.1/.test(env.PUBLIC_SITE_URL))
    problems.push('PUBLIC_SITE_URL must be the public https origin')
  if (env.MAIL_TRANSPORT === 'log') problems.push('MAIL_TRANSPORT must be smtp or resend')
  if (env.MAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) problems.push('RESEND_API_KEY is required for resend')
  if (problems.length) throw new Error(`Invalid production environment:\n${problems.map(p => `  ${p}`).join('\n')}`)
}

/** Dev/test fallback so email sign-in works without configuration; never reachable in production (asserted above). */
export const authSecret = (env: Env): string => env.AUTH_SECRET ?? 'dev-only-auth-secret-not-for-production!!'
export const turnstileEnabled = (env: Env): boolean => Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY)

export const telemetryEnabled = (env: Env): boolean => env.ENABLE_TELEMETRY && Boolean(env.SENTRY_DSN)
export const swaggerEnabled = (env: Env): boolean => env.ENABLE_SWAGGER || env.NODE_ENV !== 'production'
export const plateRecognizerCloudEnabled = (env: Env): boolean =>
  env.PLATE_RECOGNIZER_CLOUD_ENABLED && Boolean(env.PLATE_RECOGNIZER_CLOUD_TOKEN)
export const posthogQueryEnabled = (env: Env): boolean =>
  Boolean(env.POSTHOG_PERSONAL_API_KEY) && Boolean(env.POSTHOG_PROJECT_ID)
export const alprLocalEnabled = (env: Env): boolean => Boolean(env.ALPR_LOCAL_URL)
export const pixabayEnabled = (env: Env): boolean => Boolean(env.PIXABAY_API_KEY)
