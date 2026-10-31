import { describe, expect, it } from 'vitest'

import { renderContactMail } from './contact-mail.js'

const base = { email: 'a@b.co', topic: 'newApp', message: 'Hello there, I need an app.', lang: 'en' } as const
const sender = { email: 'a@b.co', via: 'code' } as const

describe('renderContactMail', () => {
  it('escapes user fields in the HTML part', () => {
    const { html } = renderContactMail(
      { ...base, name: '<b>Eve</b>', message: '<script>alert(1)</script> hello' },
      sender
    )
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>Eve</b>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('keeps the subject on one line', () => {
    const { subject } = renderContactMail({ ...base, name: 'Eve\r\nBcc: x@y.z' }, sender)
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject.startsWith('[carsua.app] newApp: ')).toBe(true)
  })

  it('falls back to the email when there is no name', () => {
    expect(renderContactMail(base, sender).subject).toBe('[carsua.app] newApp: a@b.co')
  })

  it('says how the sender was verified and uses the verified address', () => {
    const { text } = renderContactMail({ ...base, email: 'typed@x.yz' }, { email: 'real@b.co', via: 'account' })
    expect(text).toContain('real@b.co (verified: signed-in account)')
    expect(text).not.toContain('typed@x.yz')
  })
})
