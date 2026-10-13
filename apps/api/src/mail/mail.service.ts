import { Injectable, Logger } from '@nestjs/common'
import { createTransport } from 'nodemailer'
import type { Transporter } from 'nodemailer'

import { loadEnv } from '../env.js'

import { renderNoticeMail } from './render.js'
import type { NoticeEmailProps } from './templates.js'

export type OutgoingMail = { to: string; subject: string; html: string; text: string }

const RESEND_URL = 'https://api.resend.com/emails'
const SEND_TIMEOUT_MS = 10_000

/**
 * Provider-agnostic transactional mail. `MAIL_TRANSPORT=resend` (HTTP API, no SDK), `smtp` (Mailpit locally, or any
 * provider's SMTP — Brevo, Postmark, SES, Mailjet…), `log` (dev default: prints, never sends).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly env = loadEnv()
  private smtp: Transporter | null = null

  async send(mail: OutgoingMail): Promise<void> {
    switch (this.env.MAIL_TRANSPORT) {
      case 'resend':
        return this.sendResend(mail)
      case 'smtp':
        return this.sendSmtp(mail)
      default:
        // Dev only (production refuses to boot with `log`): the text part contains the code and link.
        this.logger.log(`[mail:log] to=${mail.to} subject="${mail.subject}"\n${mail.text}`)
    }
  }

  /** Renders and sends an informational notice (email changed, new sign-in, deletion scheduled). */
  async sendNotice(to: string, props: NoticeEmailProps): Promise<void> {
    await this.send({ to, ...(await renderNoticeMail(props)) })
  }

  private async sendResend(mail: OutgoingMail): Promise<void> {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.env.RESEND_API_KEY ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(this.env.MAIL_REPLY_TO ? { reply_to: this.env.MAIL_REPLY_TO } : {})
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
    })
    if (!res.ok) {
      this.logger.error(`Resend rejected the message: ${res.status} ${(await res.text()).slice(0, 300)}`)
      throw new Error(`Mail provider error ${res.status}`)
    }
  }

  private async sendSmtp(mail: OutgoingMail): Promise<void> {
    this.smtp ??= createTransport(this.env.SMTP_URL)
    await this.smtp.sendMail({
      from: this.env.MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: this.env.MAIL_REPLY_TO
    })
  }
}
