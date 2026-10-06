import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'carsua_sid'

/** 256 bits of randomness; only ever sent to the browser in the httpOnly cookie. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** What the DB stores instead of the token itself. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** The session token from a raw `Cookie` header, or null. */
export function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const pair of cookieHeader.split(';')) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    if (pair.slice(0, eq).trim() !== SESSION_COOKIE) continue
    const value = pair.slice(eq + 1).trim()
    return /^[\w-]{20,100}$/.test(value) ? value : null
  }
  return null
}

/**
 * `Set-Cookie` value for a session token (`maxAgeS > 0`) or for clearing it (`token: null`). HttpOnly (no JS access),
 * SameSite=Lax (not sent on cross-site POSTs — the CSRF guard for this JSON API), Secure outside local dev.
 */
export function sessionCookie(token: string | null, maxAgeS: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? maxAgeS : 0}`
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
