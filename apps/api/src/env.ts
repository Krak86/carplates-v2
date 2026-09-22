import { z } from 'zod'

const boolish = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform(v => v === 'true' || v === '1')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default('postgres://carplates:carplates@localhost:5432/carplates'),

  /** Absolute or relative path to the built web app; unset in dev (Vite serves it). */
  WEB_DIST_DIR: z.string().optional(),
  PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),

  NHTSA_BASE_URL: z.string().default('https://vpic.nhtsa.dot.gov/api/vehicles'),

  PLATE_RECOGNIZER_CLOUD_URL: z.string().default('https://api.platerecognizer.com/v1/plate-reader/'),
  /** Absent → the cloud recognize route answers 503. */
  PLATE_RECOGNIZER_CLOUD_TOKEN: z.string().optional(),
  /** Self-hosted SDK container base URL (Phase 4 / VPS). Unset today → the on-prem route answers 501. */
  PLATE_RECOGNIZER_ONPREM_URL: z.string().optional(),
  /** Soft ceiling on cloud lookups per calendar month, to stay under the free-tier cap with headroom. */
  PLATE_RECOGNIZER_MONTHLY_BUDGET: z.coerce.number().int().positive().default(2000),

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
  cached = parsed.data
  return cached
}

export const telemetryEnabled = (env: Env): boolean => env.ENABLE_TELEMETRY && Boolean(env.SENTRY_DSN)
export const swaggerEnabled = (env: Env): boolean => env.ENABLE_SWAGGER || env.NODE_ENV !== 'production'
export const plateRecognizerCloudEnabled = (env: Env): boolean => Boolean(env.PLATE_RECOGNIZER_CLOUD_TOKEN)
