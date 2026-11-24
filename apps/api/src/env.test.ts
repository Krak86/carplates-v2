import { beforeEach, describe, expect, it, vi } from 'vitest'

const productionEnv = {
  NODE_ENV: 'production',
  AUTH_SECRET: 'x'.repeat(32),
  DATABASE_URL: 'postgres://app:strong-pass@postgres:5432/carplates',
  PUBLIC_SITE_URL: 'https://carsua.app',
  MAIL_TRANSPORT: 'resend',
  RESEND_API_KEY: 're_test',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  ALPR_API_KEY: 'alpr-secret'
} as unknown as NodeJS.ProcessEnv

const load = async (source: NodeJS.ProcessEnv) => (await import('./env.js')).loadEnv(source)

describe('assertProductionEnv', () => {
  beforeEach(() => vi.resetModules())

  it('boots with every required secret', async () => {
    await expect(load(productionEnv)).resolves.toBeDefined()
  })

  it('rejects a missing Turnstile secret', async () => {
    await expect(load({ ...productionEnv, TURNSTILE_SECRET_KEY: undefined })).rejects.toThrow(/TURNSTILE_SECRET_KEY/)
  })

  it('rejects a missing ALPR key', async () => {
    await expect(load({ ...productionEnv, ALPR_API_KEY: undefined })).rejects.toThrow(/ALPR_API_KEY/)
  })
})
