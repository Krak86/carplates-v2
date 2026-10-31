import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common'
import { EMAIL_CHALLENGE_TTL_MINUTES, EMAIL_RESEND_SECONDS } from '@carplates/shared'
import type {
  ContactConfig,
  ContactRequest,
  ContactStartRequest,
  EmailStartResponse,
  SessionUser
} from '@carplates/shared'

import { AuthService } from '../auth/auth.service.js'
import { describeDevice } from '../auth/email-challenge.js'
import { EmailChallengeService } from '../auth/email-challenge.service.js'
import { TurnstileService } from '../auth/turnstile.js'
import { loadEnv } from '../env.js'
import { MailService } from '../mail/mail.service.js'

import { ContactLimiter } from './contact-limiter.js'
import { renderContactMail } from './contact-mail.js'

/** Who a message comes from: a signed-in account, or an address proven with a mailed code. */
export type VerifiedSender = { email: string; via: 'account' | 'code' }

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)
  private readonly env = loadEnv()
  private readonly limiter = new ContactLimiter()

  constructor(
    @Inject(MailService) private readonly mail: MailService,
    @Inject(TurnstileService) private readonly turnstile: TurnstileService,
    @Inject(EmailChallengeService) private readonly challenges: EmailChallengeService,
    @Inject(AuthService) private readonly auth: AuthService
  ) {}

  get config(): ContactConfig {
    return { enabled: !!this.recipient, turnstileSiteKey: this.turnstile.siteKey }
  }

  /** Anonymous step 1: bot check, then a code to the address. Answers like a real start even for a bot (honeypot). */
  async start(
    body: ContactStartRequest,
    ip: string | undefined,
    userAgent: string | undefined
  ): Promise<EmailStartResponse> {
    this.assertEnabled()

    if (body.website) {
      this.logger.warn('Contact honeypot filled at start, dropped')
      return {
        challengeId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + EMAIL_CHALLENGE_TTL_MINUTES * 60_000).toISOString(),
        resendAfterSeconds: EMAIL_RESEND_SECONDS
      }
    }

    if (!(await this.turnstile.verify(body.turnstileToken, ip))) throw new ForbiddenException('Challenge failed')
    // Fail before mailing a code to someone who could not send anyway.
    this.limiter.assertAllowed(senderKey(body.email, null))

    return this.challenges.start({
      email: body.email,
      purpose: 'contact',
      userId: null,
      lang: body.lang,
      device: describeDevice(userAgent)
    })
  }

  /**
   * Mails the message to `CONTACT_TO` with the sender as Reply-To. Nothing is stored. A signed-in user with an email is
   * trusted as is; anyone else must present the code mailed to the address they claim.
   */
  async send(body: ContactRequest, sessionToken: string | null): Promise<void> {
    const to = this.assertEnabled()

    // A filled honeypot is a bot: answer as if it worked, send nothing.
    if (body.website) {
      this.logger.warn('Contact honeypot filled, message dropped')
      return
    }

    const user = sessionToken ? await this.auth.userForToken(sessionToken) : null
    // Checked before the code is consumed, so a cooldown never burns a code. A verified address always equals `body.email`.
    const key = senderKey(body.email, user)
    this.limiter.assertAllowed(key)

    const sender = await this.resolveSender(body, user)

    // The code is already spent here; MailService logged the provider's reason, the client starts over with a new code.
    await this.mail.send({ to, replyTo: sender.email, ...renderContactMail(body, sender) }).catch(() => {
      throw new BadGatewayException('Could not deliver the message')
    })
    this.limiter.record(key)
  }

  /** `CONTACT_TO`, else the shared `MAIL_REPLY_TO` inbox. */
  private get recipient(): string | undefined {
    return this.env.CONTACT_TO ?? this.env.MAIL_REPLY_TO
  }

  private assertEnabled(): string {
    const to = this.recipient
    if (!to) throw new ServiceUnavailableException('Contact form is disabled')
    return to
  }

  private async resolveSender(body: ContactRequest, user: SessionUser | null): Promise<VerifiedSender> {
    if (user?.email) return { email: user.email, via: 'account' }

    if (!body.challengeId || !body.code) throw new BadRequestException('Email confirmation code required')
    const row = await this.challenges.verifyCode(body.challengeId, body.code, 'contact')
    // The code proves the address it was mailed to, not the one typed into this request.
    if (row.email !== body.email) throw new UnauthorizedException('Invalid or expired code')
    return { email: row.email, via: 'code' }
  }
}

/** Signed-in senders are limited per account, everyone else per (verified) address. */
const senderKey = (email: string, user: SessionUser | null): string =>
  user?.email ? `user:${user.id}` : `email:${email}`
