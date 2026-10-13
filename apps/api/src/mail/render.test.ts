import { describe, expect, it } from 'vitest'

import { CODE_MAIL_KINDS, NOTICE_MAIL_KINDS } from './mail-text.js'
import { renderCodeMail, renderSample } from './render.js'

const LANGS = ['ua', 'ru', 'en'] as const

describe('email templates', () => {
  it.each(LANGS)('renders every kind in %s with html and plain text', async lang => {
    for (const kind of [...CODE_MAIL_KINDS, ...NOTICE_MAIL_KINDS]) {
      const mail = await renderSample(kind, lang)
      expect(mail.subject.length).toBeGreaterThan(0)
      expect(mail.subject).not.toMatch(/\{\w+\}/)
      expect(mail.html).toContain('<html')
      expect(mail.text.length).toBeGreaterThan(0)
    }
  })

  it('puts the code and the magic link in both parts of a code email', async () => {
    const mail = await renderCodeMail({
      kind: 'signIn',
      lang: 'en',
      code: '482913',
      link: 'https://carsua.app/auth/email#t=abc',
      minutes: 15,
      device: 'Firefox on Linux'
    })
    expect(mail.subject).toContain('482913')
    expect(mail.html).toContain('482913')
    expect(mail.html).toContain('https://carsua.app/auth/email#t=abc')
    expect(mail.text).toContain('482913')
    expect(mail.text).toContain('https://carsua.app/auth/email#t=abc')
  })

  it('escapes a hostile device string', async () => {
    const mail = await renderCodeMail({
      kind: 'signIn',
      lang: 'en',
      code: '111111',
      link: 'https://carsua.app/x',
      minutes: 15,
      device: '<script>alert(1)</script>'
    })
    expect(mail.html).not.toContain('<script>')
  })
})
