import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { emailChallenges } from '@carplates/db'
import type { EmailChallengeRow } from '@carplates/db'
import { EMAIL_CHALLENGE_TTL_MINUTES, EMAIL_RESEND_SECONDS } from '@carplates/shared'
import type { EmailStartResponse, UiLang } from '@carplates/shared'
import { and, count, eq, gt, isNull, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { authSecret, loadEnv } from '../env.js'
import { MailService } from '../mail/mail.service.js'
import { renderCodeMail } from '../mail/render.js'
import type { CodeMailKind } from '../mail/mail-text.js'

import {
  MAX_CODE_ATTEMPTS,
  SEND_DAILY_LIMIT,
  SEND_WINDOW_LIMIT,
  SEND_WINDOW_MS,
  codeMatches,
  generateCode,
  generateLinkToken,
  hashCode,
  hashLinkToken
} from './email-challenge.js'

export type ChallengePurpose = 'sign_in' | 'set_email' | 'reauth' | 'contact'

const KIND_BY_PURPOSE: Record<ChallengePurpose, CodeMailKind> = {
  sign_in: 'signIn',
  set_email: 'setEmail',
  reauth: 'reauth',
  contact: 'contact'
}

export type CreateChallengeInput = {
  email: string
  purpose: ChallengePurpose
  /** Owner for `set_email` / `reauth`; null for `sign_in`. */
  userId: string | null
  lang: UiLang
  /** "Chrome on Windows" — shown in the mail so the recipient can tell whether they asked for it. */
  device: string
}

/** Creates, mails and consumes short-lived email challenges (6-digit code + magic link, 15 min, single use). */
@Injectable()
export class EmailChallengeService {
  private readonly env = loadEnv()
  private readonly secret = authSecret(this.env)

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(MailService) private readonly mail: MailService
  ) {}

  async start(input: CreateChallengeInput): Promise<EmailStartResponse> {
    const { db } = this.dbService
    await this.assertSendAllowed(input.email)

    // A fresh challenge supersedes any still-open one for the same address and purpose.
    await db
      .update(emailChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(emailChallenges.email, input.email),
          eq(emailChallenges.purpose, input.purpose),
          isNull(emailChallenges.consumedAt)
        )
      )

    const id = crypto.randomUUID()
    const code = generateCode()
    const linkToken = generateLinkToken()
    const expiresAt = new Date(Date.now() + EMAIL_CHALLENGE_TTL_MINUTES * 60_000)
    await db.insert(emailChallenges).values({
      id,
      email: input.email,
      purpose: input.purpose,
      userId: input.userId,
      codeHash: hashCode(this.secret, id, code),
      linkHash: hashLinkToken(linkToken),
      lang: input.lang,
      expiresAt
    })
    // Opportunistic cleanup instead of a cron job, like sessions.
    await db.delete(emailChallenges).where(lt(emailChallenges.expiresAt, sql`now() - interval '1 day'`))

    // Only sign-in mails carry the magic link: its landing page signs the browser in, which must never follow a set-email / re-auth code.
    const link =
      input.purpose === 'sign_in' ? `${new URL(this.env.PUBLIC_SITE_URL).origin}/auth/email#t=${linkToken}` : null
    const mail = await renderCodeMail({
      kind: KIND_BY_PURPOSE[input.purpose],
      lang: input.lang,
      code,
      link,
      minutes: EMAIL_CHALLENGE_TTL_MINUTES,
      device: input.device
    })
    await this.mail.send({ to: input.email, ...mail })

    return { challengeId: id, expiresAt: expiresAt.toISOString(), resendAfterSeconds: EMAIL_RESEND_SECONDS }
  }

  /** Consumes a challenge by `(id, code)`. Every failure is the same 401 so nothing leaks about which part was wrong. */
  async verifyCode(challengeId: string, code: string, purpose: ChallengePurpose): Promise<EmailChallengeRow> {
    const { db } = this.dbService
    // Count the attempt first and atomically: parallel guesses cannot beat the cap.
    const [row] = await db
      .update(emailChallenges)
      .set({ attempts: sql`${emailChallenges.attempts} + 1` })
      .where(
        and(
          eq(emailChallenges.id, challengeId),
          eq(emailChallenges.purpose, purpose),
          isNull(emailChallenges.consumedAt),
          gt(emailChallenges.expiresAt, sql`now()`)
        )
      )
      .returning()
    if (!row) throw invalidCode()

    if (row.attempts > MAX_CODE_ATTEMPTS) {
      await this.burn(row.id)
      throw invalidCode()
    }
    if (!codeMatches(this.secret, row.id, code, row.codeHash)) throw invalidCode()
    return this.consume(row.id)
  }

  /** Consumes a challenge by its magic-link token. */
  async verifyLink(token: string, purpose: ChallengePurpose): Promise<EmailChallengeRow> {
    const [row] = await this.dbService.db
      .update(emailChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(emailChallenges.linkHash, hashLinkToken(token)),
          eq(emailChallenges.purpose, purpose),
          isNull(emailChallenges.consumedAt),
          gt(emailChallenges.expiresAt, sql`now()`)
        )
      )
      .returning()
    if (!row) throw invalidCode()
    return row
  }

  private async consume(id: string): Promise<EmailChallengeRow> {
    const [row] = await this.dbService.db
      .update(emailChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(emailChallenges.id, id), isNull(emailChallenges.consumedAt)))
      .returning()
    if (!row) throw invalidCode()
    return row
  }

  private async burn(id: string): Promise<void> {
    await this.dbService.db.update(emailChallenges).set({ consumedAt: new Date() }).where(eq(emailChallenges.id, id))
  }

  /** ≤ 3 sends / 15 min and ≤ 10 / day per address — in the DB, so it survives restarts and works across instances. */
  private async assertSendAllowed(email: string): Promise<void> {
    const { db } = this.dbService
    const since = (ms: number): Date => new Date(Date.now() - ms)
    const [burst] = await db
      .select({ n: count() })
      .from(emailChallenges)
      .where(and(eq(emailChallenges.email, email), gt(emailChallenges.createdAt, since(SEND_WINDOW_MS))))
    if ((burst?.n ?? 0) >= SEND_WINDOW_LIMIT) throw tooMany(Math.ceil(SEND_WINDOW_MS / 1000))

    const [daily] = await db
      .select({ n: count() })
      .from(emailChallenges)
      .where(and(eq(emailChallenges.email, email), gt(emailChallenges.createdAt, since(24 * 3_600_000))))
    if ((daily?.n ?? 0) >= SEND_DAILY_LIMIT) throw tooMany(3600)
  }
}

function invalidCode(): UnauthorizedException {
  return new UnauthorizedException('Invalid or expired code')
}

function tooMany(retryAfterSeconds: number): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many codes requested for this address',
      retryAfterSeconds
    },
    HttpStatus.TOO_MANY_REQUESTS
  )
}
