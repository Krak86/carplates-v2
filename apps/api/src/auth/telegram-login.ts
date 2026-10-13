import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'

/** Telegram's own advice: reject payloads older than a day (a captured payload could otherwise be replayed forever). */
const MAX_AGE_S = 24 * 60 * 60
/** Clock drift tolerated on a future `auth_date`. */
const SKEW_S = 60

export class InvalidTelegramLoginError extends Error {
  constructor(reason: string) {
    super(`Invalid Telegram login: ${reason}`)
    this.name = 'InvalidTelegramLoginError'
  }
}

export type TelegramIdentity = {
  /** Numeric Telegram user id (stable; usernames are not). */
  subject: string
  name: string | null
  picture: string | null
}

const fieldsSchema = z.object({
  id: z.coerce.number().int().positive(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.coerce.number().int(),
  hash: z.string().regex(/^[0-9a-f]{64}$/)
})

/**
 * Verifies the Login Widget payload: HMAC-SHA256, keyed with SHA256(bot token), over the other fields sorted by key
 * and joined as `key=value` lines (https://core.telegram.org/widgets/login#checking-authorization). Every field the
 * widget sent takes part in the check string, known to us or not.
 */
export function verifyTelegramLogin(
  payload: Record<string, string | number>,
  botToken: string,
  nowS = Math.floor(Date.now() / 1000)
): TelegramIdentity {
  const parsed = fieldsSchema.safeParse(payload)
  if (!parsed.success) throw new InvalidTelegramLoginError('malformed payload')
  const fields = parsed.data

  const checkString = Object.entries(payload)
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(checkString).digest()
  const given = Buffer.from(fields.hash, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new InvalidTelegramLoginError('bad signature')
  }

  if (fields.auth_date > nowS + SKEW_S) throw new InvalidTelegramLoginError('auth_date in the future')
  if (nowS - fields.auth_date > MAX_AGE_S) throw new InvalidTelegramLoginError('expired')

  const name = [fields.first_name, fields.last_name].filter(Boolean).join(' ') || fields.username || null
  return { subject: String(fields.id), name, picture: fields.photo_url ?? null }
}
