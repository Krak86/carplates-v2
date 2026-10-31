import { ForbiddenException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import type { ContactConfig, ContactRequest } from '@carplates/shared'

import { TurnstileService } from '../auth/turnstile.js'
import { loadEnv } from '../env.js'
import { MailService } from '../mail/mail.service.js'

import { renderContactMail } from './contact-mail.js'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)
  private readonly env = loadEnv()

  constructor(
    @Inject(MailService) private readonly mail: MailService,
    @Inject(TurnstileService) private readonly turnstile: TurnstileService
  ) {}

  get config(): ContactConfig {
    return { enabled: !!this.env.CONTACT_TO, turnstileSiteKey: this.turnstile.siteKey }
  }

  /** Mails the message to `CONTACT_TO` with the sender as Reply-To. Nothing is stored. */
  async send(body: ContactRequest, ip: string | undefined): Promise<void> {
    const to = this.env.CONTACT_TO
    if (!to) throw new ServiceUnavailableException('Contact form is disabled')

    // A filled honeypot is a bot: answer as if it worked, send nothing.
    if (body.website) {
      this.logger.warn('Contact honeypot filled, message dropped')
      return
    }

    if (!(await this.turnstile.verify(body.turnstileToken, ip))) throw new ForbiddenException('Challenge failed')

    await this.mail.send({ to, replyTo: body.email, ...renderContactMail(body) })
  }
}
