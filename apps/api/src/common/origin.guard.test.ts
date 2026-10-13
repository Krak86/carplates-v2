import { describe, expect, it } from 'vitest'

import { isTrustedOrigin } from './origin.guard.js'

const ALLOWED = ['https://carsua.app']

describe('isTrustedOrigin', () => {
  it('trusts same-origin fetches and navigations', () => {
    expect(isTrustedOrigin({ 'sec-fetch-site': 'same-origin' }, ALLOWED)).toBe(true)
    expect(isTrustedOrigin({ 'sec-fetch-site': 'none' }, ALLOWED)).toBe(true)
  })

  it('rejects cross-site and same-site (sibling subdomain) requests', () => {
    expect(isTrustedOrigin({ 'sec-fetch-site': 'cross-site' }, ALLOWED)).toBe(false)
    expect(isTrustedOrigin({ 'sec-fetch-site': 'same-site' }, ALLOWED)).toBe(false)
  })

  it('falls back to Origin when Sec-Fetch-Site is missing', () => {
    expect(isTrustedOrigin({ origin: 'https://carsua.app' }, ALLOWED)).toBe(true)
    expect(isTrustedOrigin({ origin: 'https://evil.example' }, ALLOWED)).toBe(false)
  })

  it('lets header-less clients through (no browser cookies involved)', () => {
    expect(isTrustedOrigin({}, ALLOWED)).toBe(true)
  })
})
