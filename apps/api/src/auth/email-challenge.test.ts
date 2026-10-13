import { describe, expect, it } from 'vitest'

import {
  codeMatches,
  describeDevice,
  generateCode,
  generateLinkToken,
  hashCode,
  hashLinkToken
} from './email-challenge.js'

const SECRET = 'test-secret-test-secret-test-secret!'

describe('email challenge crypto', () => {
  it('generates zero-padded 6-digit codes', () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^\d{6}$/)
  })

  it('generates distinct 256-bit link tokens', () => {
    const a = generateLinkToken()
    expect(a).toMatch(/^[\w-]{43}$/)
    expect(generateLinkToken()).not.toBe(a)
  })

  it('binds the code hash to the challenge id and the secret', () => {
    const stored = hashCode(SECRET, 'challenge-1', '123456')
    expect(codeMatches(SECRET, 'challenge-1', '123456', stored)).toBe(true)
    expect(codeMatches(SECRET, 'challenge-1', '123457', stored)).toBe(false)
    expect(codeMatches(SECRET, 'challenge-2', '123456', stored)).toBe(false)
    expect(codeMatches('another-secret-another-secret-xx!', 'challenge-1', '123456', stored)).toBe(false)
  })

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(codeMatches(SECRET, 'c', '123456', 'zz')).toBe(false)
  })

  it('hashes link tokens deterministically', () => {
    expect(hashLinkToken('abc')).toBe(hashLinkToken('abc'))
    expect(hashLinkToken('abc')).not.toBe(hashLinkToken('abd'))
  })
})

describe('describeDevice', () => {
  it('names browser and OS', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
      )
    ).toBe('Chrome on Windows')
    expect(describeDevice('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe(
      'Firefox on Linux'
    )
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe('Safari on iOS')
  })

  it('handles missing user agents', () => {
    expect(describeDevice(undefined)).toBe('Unknown device')
  })
})
