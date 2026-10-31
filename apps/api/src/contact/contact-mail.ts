import type { ContactRequest } from '@carplates/shared'

export type ContactSender = { email: string; via: 'account' | 'code' }

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, ch => ESCAPES[ch] ?? ch)

/** Header values must stay on one line: a newline in the name would otherwise let a sender inject headers. */
const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim()

const VERIFIED_LABEL: Record<ContactSender['via'], string> = {
  account: 'signed-in account',
  code: 'confirmed with an emailed code'
}

/**
 * Subject, plain-text and HTML bodies of a contact-form message. Every user field is escaped in the HTML part. The sender
 * is always a verified address (account or emailed code), and the mail says how, so a Reply goes to a real mailbox.
 */
export function renderContactMail(
  body: ContactRequest,
  sender: ContactSender
): { subject: string; text: string; html: string } {
  const name = oneLine(body.name ?? '') || '-'
  const subject = `[carsua.app] ${body.topic}: ${oneLine(body.name || sender.email)}`.slice(0, 200)
  const verified = VERIFIED_LABEL[sender.via]

  const text = [
    `Topic: ${body.topic}`,
    `Name: ${name}`,
    `Email: ${sender.email} (verified: ${verified})`,
    `Language: ${body.lang}`,
    '',
    body.message
  ].join('\n')

  const html = [
    `<p><strong>Topic:</strong> ${escapeHtml(body.topic)}<br>`,
    `<strong>Name:</strong> ${escapeHtml(name)}<br>`,
    `<strong>Email:</strong> ${escapeHtml(sender.email)} (verified: ${escapeHtml(verified)})<br>`,
    `<strong>Language:</strong> ${escapeHtml(body.lang)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(body.message)}</p>`
  ].join('\n')

  return { subject, text, html }
}
