import { Injectable, Logger } from '@nestjs/common'
import { z } from 'zod'

import { fetchJson } from '../common/fetch-json.js'
import { loadEnv } from '../env.js'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const verifySchema = z.object({ success: z.boolean().optional() })

/** Cloudflare Turnstile server-side check. Without `TURNSTILE_SECRET_KEY` every token passes (local dev). */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name)
  private readonly env = loadEnv()

  get siteKey(): string | null {
    return this.env.TURNSTILE_SECRET_KEY ? (this.env.TURNSTILE_SITE_KEY ?? null) : null
  }

  async verify(token: string | undefined, ip: string | undefined): Promise<boolean> {
    const secret = this.env.TURNSTILE_SECRET_KEY
    if (!secret) return true
    if (!token) return false
    try {
      const body = new URLSearchParams({ secret, response: token })
      if (ip) body.set('remoteip', ip)
      const json = await fetchJson(VERIFY_URL, verifySchema, {
        timeoutMs: 5_000,
        maxBytes: 64 * 1024,
        init: { method: 'POST', body }
      })
      return json.success === true
    } catch (err) {
      // Fail closed: a Turnstile outage must not open the mail-sending endpoint to bots.
      this.logger.warn(`Turnstile verification failed: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }
}
