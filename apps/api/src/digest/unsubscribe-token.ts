import { createHmac, timingSafeEqual } from 'node:crypto'

const PURPOSE = 'digest-unsubscribe'
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(secret: string, userId: string): string {
  return createHmac('sha256', secret).update(`${PURPOSE}:${userId}`).digest('base64url')
}

/**
 * Self-contained unsubscribe token `<userId>.<hmac>`. It carries no expiry on purpose: an old mail must still work, and
 * the only thing it can do is switch the digest off for that one user.
 */
export function createUnsubscribeToken(secret: string, userId: string): string {
  return `${userId}.${sign(secret, userId)}`
}

/** The user id inside a valid token, else `null`. Constant-time signature comparison. */
export function verifyUnsubscribeToken(secret: string, token: string): string | null {
  const [userId, signature, extra] = token.split('.')
  if (!userId || !signature || extra !== undefined || !USER_ID.test(userId)) return null
  const expected = Buffer.from(sign(secret, userId))
  const given = Buffer.from(signature)
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null
}
