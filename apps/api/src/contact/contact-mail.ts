import type { ContactRequest } from '@carplates/shared'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, ch => ESCAPES[ch] ?? ch)

/** Header values must stay on one line: a newline in the name would otherwise let a sender inject headers. */
const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim()

/** Subject, plain-text and HTML bodies of a contact-form message. Every user field is escaped in the HTML part. */
export function renderContactMail(body: ContactRequest): { subject: string; text: string; html: string } {
  const who = oneLine(body.name || body.email)
  const subject = `[carsua.app] ${body.topic}: ${who}`.slice(0, 200)

  const text = [
    `Topic: ${body.topic}`,
    `Name: ${oneLine(body.name ?? '') || '-'}`,
    `Email: ${body.email}`,
    `Language: ${body.lang}`,
    '',
    body.message
  ].join('\n')

  const html = [
    `<p><strong>Topic:</strong> ${escapeHtml(body.topic)}<br>`,
    `<strong>Name:</strong> ${escapeHtml(oneLine(body.name ?? '') || '-')}<br>`,
    `<strong>Email:</strong> ${escapeHtml(body.email)}<br>`,
    `<strong>Language:</strong> ${escapeHtml(body.lang)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(body.message)}</p>`
  ].join('\n')

  return { subject, text, html }
}
