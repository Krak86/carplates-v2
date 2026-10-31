import { describe, expect, it } from 'vitest'

import { CONTACT_MESSAGE_MAX, contactRequestSchema } from './contact.js'

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
})
