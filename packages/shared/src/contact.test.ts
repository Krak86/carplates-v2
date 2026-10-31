import { describe, expect, it } from 'vitest'

import { CONTACT_MESSAGE_MAX, contactRequestSchema, contactStartRequestSchema, countLinks } from './contact.js'

const valid = { email: 'Person@Example.com ', topic: 'newApp', message: 'I would like a small web app.' }

describe('contactRequestSchema', () => {
  it('normalizes the email and defaults the language', () => {
    const parsed = contactRequestSchema.parse(valid)
    expect(parsed.email).toBe('person@example.com')
    expect(parsed.lang).toBe('ua')
  })

  it('rejects a short or oversized message', () => {
    expect(contactRequestSchema.safeParse({ ...valid, message: 'too short' }).success).toBe(false)
    expect(contactRequestSchema.safeParse({ ...valid, message: 'x'.repeat(CONTACT_MESSAGE_MAX + 1) }).success).toBe(
      false
    )
  })

  it('rejects an unknown topic and a bad email', () => {
    expect(contactRequestSchema.safeParse({ ...valid, topic: 'spam' }).success).toBe(false)
    expect(contactRequestSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('refuses a message with more than two links', () => {
    const links = 'see http://a.example https://b.example and www.c.example please'
    expect(contactRequestSchema.safeParse({ ...valid, message: links }).success).toBe(false)
    expect(contactRequestSchema.safeParse({ ...valid, message: 'see https://a.example only, thanks' }).success).toBe(
      true
    )
  })

  it('accepts a 6-digit code but not other shapes', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(contactRequestSchema.safeParse({ ...valid, challengeId: id, code: '123456' }).success).toBe(true)
    expect(contactRequestSchema.safeParse({ ...valid, challengeId: id, code: '12ab56' }).success).toBe(false)
  })
})

describe('contactStartRequestSchema', () => {
  it('needs only an address', () => {
    expect(contactStartRequestSchema.parse({ email: 'a@b.co' }).lang).toBe('ua')
  })
})

describe('countLinks', () => {
  it('counts http(s) and www links', () => {
    expect(countLinks('no links here')).toBe(0)
    expect(countLinks('http://a.b, HTTPS://c.d and www.e.f')).toBe(3)
  })
})
