import { render } from '@react-email/render'

import type { Lang } from '../spa/spa-text.js'

import { CODE_TEXT, NOTICE_TEXT, fill } from './mail-text.js'
import type { CodeMailKind, NoticeMailKind } from './mail-text.js'
import { CodeEmail, NoticeEmail } from './templates.js'
import type { CodeEmailProps, NoticeEmailProps } from './templates.js'

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

/** Fixed sample data for the dev preview route and the render tests. */
export async function renderSample(kind: CodeMailKind | NoticeMailKind, lang: Lang): Promise<RenderedMail> {
  const link = 'https://carsua.app/auth/email#t=sample'
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
