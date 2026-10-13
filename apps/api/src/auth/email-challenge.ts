import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

import { EMAIL_CODE_LENGTH } from '@carplates/shared'

/** Wrong guesses allowed per challenge before it is burned (6 digits = 1e6 combinations, so 5 tries ≈ 0.0005 %). */
export const MAX_CODE_ATTEMPTS = 5
/** Per-address send limits, counted in the DB: a burst window and a daily cap. */
export const SEND_WINDOW_MS = 15 * 60_000
export const SEND_WINDOW_LIMIT = 3
export const SEND_DAILY_LIMIT = 10

/** Uniformly random zero-padded numeric code. */
export function generateCode(): string {
  return randomInt(0, 10 ** EMAIL_CODE_LENGTH)
    .toString()
    .padStart(EMAIL_CODE_LENGTH, '0')
}

/** 256-bit URL-safe magic-link token. */
export function generateLinkToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Keyed hash: a bare hash of a 6-digit code could be brute-forced offline from a database dump. */
export function hashCode(secret: string, challengeId: string, code: string): string {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex')
}

/** The token is 256-bit random, so a plain SHA-256 is enough (and lets us look the row up by hash). */
export function hashLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function codeMatches(secret: string, challengeId: string, code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashCode(secret, challengeId, code), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** "Chrome on Windows" from a User-Agent — shown in emails and the sessions list; never used for security decisions. */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device'
  const ua = userAgent
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null
  return os ? `${browser} on ${os}` : browser
}
