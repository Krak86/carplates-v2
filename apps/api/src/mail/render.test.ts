import { describe, expect, it } from 'vitest'

import { CODE_MAIL_KINDS, NOTICE_MAIL_KINDS } from './mail-text.js'
import { renderCodeMail, renderDigestMail, renderSample } from './render.js'

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

  it.each(LANGS)('renders the monthly digest in %s with the unsubscribe link', async lang => {
    const mail = await renderSample('digest', lang)
    expect(mail.subject).not.toMatch(/{w+}/)
    expect(mail.html).toContain('https://carsua.app/unsubscribe#t=sample')
    expect(mail.text).toContain('https://carsua.app/unsubscribe#t=sample')
    expect(mail.html).toContain('Sample feature one')
  })

  it('leaves out the summary line when the month has nothing but new features', async () => {
    const mail = await renderDigestMail({
      lang: 'en',
      month: 'October 2026',
      features: ['A'],
      counts: { improved: 0, data: 0, fix: 0 },
      releasesUrl: 'https://carsua.app/releases',
      unsubscribeUrl: 'https://carsua.app/unsubscribe#t=x'
    })
    expect(mail.text).not.toContain('Also this month')
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
