import { describe, expect, it } from 'vitest'

import {
  SESSION_COOKIE,
  hashSessionToken,
  newSessionToken,
  readSessionCookie,
  sessionCookie
} from './session-cookie.js'

describe('session cookie', () => {
  it('round-trips a fresh token through the Cookie header', () => {
    const token = newSessionToken()
    expect(readSessionCookie(`theme=dark; ${SESSION_COOKIE}=${token}; other=1`)).toBe(token)
  })

  it('ignores missing, foreign and malformed cookies', () => {
    expect(readSessionCookie(undefined)).toBeNull()
    expect(readSessionCookie('theme=dark')).toBeNull()
    expect(readSessionCookie(`${SESSION_COOKIE}=short`)).toBeNull()
    expect(readSessionCookie(`${SESSION_COOKIE}=${'a'.repeat(30)};drop table`)).toBe('a'.repeat(30))
  })

  it('never stores the token itself', () => {
    const token = newSessionToken()
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashSessionToken(token)).not.toContain(token)
  })

  it('sets and clears with the right attributes', () => {
    expect(sessionCookie('tok', 60, true)).toBe(
      `${SESSION_COOKIE}=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure`
    )
    expect(sessionCookie(null, 60, false)).toBe(`${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  })
})
