import { describe, expect, it } from 'vitest'

import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token.js'

const SECRET = 'a-test-secret-that-is-at-least-32-chars'
const USER = '3f0c7a52-5c3e-4f6e-9a55-0d6e2a1b7c10'

describe('unsubscribe token', () => {
  it('round-trips the user id', () => {
    expect(verifyUnsubscribeToken(SECRET, createUnsubscribeToken(SECRET, USER))).toBe(USER)
  })

  it('rejects a token signed with another secret or for another user', () => {
    const token = createUnsubscribeToken(SECRET, USER)
    expect(verifyUnsubscribeToken('another-secret-that-is-at-least-32-chars', token)).toBeNull()
    const other = '11111111-1111-4111-8111-111111111111'
    expect(verifyUnsubscribeToken(SECRET, `${other}.${token.split('.')[1] ?? ''}`)).toBeNull()
  })

  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', `${USER}`, `${USER}.`, `${USER}.a.b`, 'not-a-uuid.sig']) {
      expect(verifyUnsubscribeToken(SECRET, bad)).toBeNull()
    }
  })
})
