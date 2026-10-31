import { describe, expect, it } from 'vitest'

import { renderContactMail } from './contact-mail.js'

const base = { email: 'a@b.co', topic: 'newApp', message: 'Hello there, I need an app.', lang: 'en' } as const

describe('renderContactMail', () => {
  it('escapes user fields in the HTML part', () => {
    const { html } = renderContactMail({ ...base, name: '<b>Eve</b>', message: '<script>alert(1)</script> hello' })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>Eve</b>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('keeps the subject on one line', () => {
    const { subject } = renderContactMail({ ...base, name: 'Eve\r\nBcc: x@y.z' })
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject.startsWith('[carsua.app] newApp: ')).toBe(true)
  })

  it('falls back to the email when there is no name', () => {
    expect(renderContactMail(base).subject).toBe('[carsua.app] newApp: a@b.co')
  })
})
