import { render } from '@react-email/render'

import type { Lang } from '../spa/spa-text.js'

import { CODE_TEXT, DIGEST_MAIL_KIND, DIGEST_TEXT, NOTICE_TEXT, fill } from './mail-text.js'
import type { CodeMailKind, NoticeMailKind } from './mail-text.js'
import { CodeEmail, DigestEmail, NoticeEmail } from './templates.js'
import type { CodeEmailProps, DigestEmailProps, NoticeEmailProps } from './templates.js'

export type RenderedMail = { subject: string; html: string; text: string }

export async function renderCodeMail(props: CodeEmailProps): Promise<RenderedMail> {
  const element = <CodeEmail {...props} />
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  return { subject: CODE_TEXT[props.kind][props.lang].subject(props.code), html, text }
}

export async function renderNoticeMail(props: NoticeEmailProps): Promise<RenderedMail> {
  const element = <NoticeEmail {...props} />
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  return { subject: fill(NOTICE_TEXT[props.kind][props.lang].subject, props.values), html, text }
}

export async function renderDigestMail(props: DigestEmailProps): Promise<RenderedMail> {
  const element = <DigestEmail {...props} />
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])
  return { subject: DIGEST_TEXT[props.lang].subject(props.month), html, text }
}

/** Fixed sample data for the dev preview route and the render tests. */
export async function renderSample(
  kind: CodeMailKind | NoticeMailKind | typeof DIGEST_MAIL_KIND,
  lang: Lang
): Promise<RenderedMail> {
  const link = 'https://carsua.app/auth/email#t=sample'
  if (kind === DIGEST_MAIL_KIND) {
    return renderDigestMail({
      lang,
      month: lang === 'en' ? 'October 2026' : 'жовтень 2026',
      features: ['Sample feature one', 'Sample feature two'],
      counts: { improved: 12, data: 4, fix: 3 },
      releasesUrl: 'https://carsua.app/releases',
      unsubscribeUrl: 'https://carsua.app/unsubscribe#t=sample'
    })
  }
  if (kind === 'signIn' || kind === 'setEmail' || kind === 'reauth') {
    return renderCodeMail({ kind, lang, code: '123456', link, minutes: 15, device: 'Chrome on Windows' })
  }
  return renderNoticeMail({
    kind,
    lang,
    link: 'https://carsua.app/profile#devices',
    values: { device: 'Chrome on Windows', time: '2026-10-13 14:05 UTC', days: '14', email: 'new@example.com' }
  })
}
