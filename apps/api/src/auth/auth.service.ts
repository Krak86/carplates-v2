import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common'
import { authIdentities, knownDevices, sessions, users } from '@carplates/db'
import type { UserRow } from '@carplates/db'
import { USER_ROLES } from '@carplates/shared'
import type { EmailStartRequest, EmailStartResponse, SessionUser, TelegramSignInRequest } from '@carplates/shared'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv } from '../env.js'
import { MailService } from '../mail/mail.service.js'
import { DEFAULT_LANG, LANGS } from '../spa/spa-text.js'
import type { Lang } from '../spa/spa-text.js'

import type { ClientContext } from './client-context.js'
import { describeDevice } from './email-challenge.js'
import { EmailChallengeService } from './email-challenge.service.js'
import { GoogleIdTokenVerifier, InvalidIdTokenError } from './google-id-token.js'
import type { GoogleIdentity } from './google-id-token.js'
import { hashDeviceId, hashSessionToken, newDeviceId, newSessionToken } from './session-cookie.js'
import { InvalidTelegramLoginError, verifyTelegramLogin } from './telegram-login.js'
import type { TelegramIdentity } from './telegram-login.js'
import { TurnstileService } from './turnstile.js'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    role: USER_ROLES.find(r => r === row.role) ?? 'user',
    createdAt: row.createdAt.toISOString(),
    deletionScheduledAt: row.deletionScheduledAt?.toISOString() ?? null,
    marketingOptIn: row.marketingOptIn
  }
}

/** The language an account's emails go out in: its last sign-in language, else the site default. */
export function userMailLang(row: Pick<UserRow, 'lang'>): Lang {
  return LANGS.find(l => l === row.lang) ?? DEFAULT_LANG
}

export type SignInResult = { user: SessionUser; token: string; deviceId: string }

/** A live session resolved from its cookie token. */
export type ResolvedSession = { user: SessionUser; sessionId: string; tokenHash: string; authAt: Date }

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly env = loadEnv()
  private readonly google = this.env.GOOGLE_CLIENT_ID ? new GoogleIdTokenVerifier(this.env.GOOGLE_CLIENT_ID) : null

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(EmailChallengeService) private readonly challenges: EmailChallengeService,
    @Inject(TurnstileService) private readonly turnstile: TurnstileService,
    @Inject(MailService) private readonly mail: MailService
  ) {}

  get googleClientId(): string | null {
    return this.env.GOOGLE_CLIENT_ID ?? null
  }

  get telegramBotUsername(): string | null {
    return this.telegramBotToken ? (this.env.TELEGRAM_BOT_USERNAME ?? null) : null
  }

  private get telegramBotToken(): string | null {
    return this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_BOT_USERNAME ? this.env.TELEGRAM_BOT_TOKEN : null
  }

  get turnstileSiteKey(): string | null {
    return this.turnstile.siteKey
  }

  get deletionGraceDays(): number {
    return this.env.ACCOUNT_DELETION_GRACE_DAYS
  }

  get sessionTtlMs(): number {
    return this.env.SESSION_TTL_DAYS * DAY_MS
  }

  /** Verifies a Google ID token (signature, issuer, audience, expiry, verified email). */
  async verifyGoogle(credential: string): Promise<GoogleIdentity> {
    if (!this.google) throw new ServiceUnavailableException('Google sign-in is not configured')
    try {
      return await this.google.verify(credential)
    } catch (err) {
      if (err instanceof InvalidIdTokenError) {
        this.logger.warn(err.message)
        throw new UnauthorizedException('Invalid Google credential')
      }
      throw err
    }
  }

  /** Verifies a Telegram Login Widget payload (HMAC with the bot token, `auth_date` ≤ 24 h). */
  verifyTelegram(payload: TelegramSignInRequest): TelegramIdentity {
    const botToken = this.telegramBotToken
    if (!botToken) throw new ServiceUnavailableException('Telegram sign-in is not configured')
    try {
      return verifyTelegramLogin(payload, botToken)
    } catch (err) {
      if (err instanceof InvalidTelegramLoginError) {
        this.logger.warn(err.message)
        throw new UnauthorizedException('Invalid Telegram login')
      }
      throw err
    }
  }

  async signInWithGoogle(credential: string, ctx: ClientContext): Promise<SignInResult> {
    const user = await this.upsertGoogleUser(await this.verifyGoogle(credential))
    return this.issueSession(user, ctx, 'google')
  }

  async signInWithTelegram(payload: TelegramSignInRequest, ctx: ClientContext): Promise<SignInResult> {
    const user = await this.upsertTelegramUser(this.verifyTelegram(payload))
    return this.issueSession(user, ctx, 'telegram')
  }

  /** Step 1 of email sign-in. Same response whether or not the address has an account. */
  async startEmailSignIn(
    body: EmailStartRequest,
    ip: string | undefined,
    ctx: ClientContext
  ): Promise<EmailStartResponse> {
    if (!(await this.turnstile.verify(body.turnstileToken, ip))) throw new ForbiddenException('Challenge failed')
    return this.challenges.start({
      email: body.email,
      purpose: 'sign_in',
      userId: null,
      lang: body.lang,
      device: describeDevice(ctx.userAgent)
    })
  }

  async signInWithEmailCode(challengeId: string, code: string, ctx: ClientContext): Promise<SignInResult> {
    const challenge = await this.challenges.verifyCode(challengeId, code, 'sign_in')
    return this.finishEmailSignIn(challenge.email, challenge.lang, ctx)
  }

  async signInWithEmailLink(token: string, ctx: ClientContext): Promise<SignInResult> {
    const challenge = await this.challenges.verifyLink(token, 'sign_in')
    return this.finishEmailSignIn(challenge.email, challenge.lang, ctx)
  }

  private async finishEmailSignIn(email: string, lang: string, ctx: ClientContext): Promise<SignInResult> {
    const user = await this.upsertEmailUser(email, lang)
    return this.issueSession(user, ctx, 'email')
  }

  /** The user behind a session token, or null if none/expired. */
  async userForToken(token: string): Promise<SessionUser | null> {
    return (await this.resolveSession(token))?.user ?? null
  }

  /** The live session for a cookie token, extending it when past half its lifetime and noting the visit (hourly). */
  async resolveSession(token: string): Promise<ResolvedSession | null> {
    const { db } = this.dbService
    const tokenHash = hashSessionToken(token)
    const [row] = await db
      .select({
        user: users,
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        authAt: sessions.authAt,
        lastSeenAt: sessions.lastSeenAt
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, sql`now()`)))
      .limit(1)
    if (!row) return null

    const extend = row.expiresAt.getTime() - Date.now() < this.sessionTtlMs / 2
    const seen = Date.now() - row.lastSeenAt.getTime() > HOUR_MS
    if (extend || seen) {
      await db
        .update(sessions)
        .set({
          ...(extend ? { expiresAt: new Date(Date.now() + this.sessionTtlMs) } : {}),
          ...(seen ? { lastSeenAt: new Date() } : {})
        })
        .where(eq(sessions.tokenHash, tokenHash))
    }
    return { user: toSessionUser(row.user), sessionId: row.sessionId, tokenHash, authAt: row.authAt }
  }

  async signOut(token: string): Promise<void> {
    await this.dbService.db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  /**
   * "Delete account": all sessions end now and the account is purged after `ACCOUNT_DELETION_GRACE_DAYS` unless the
   * user signs in again first (any sign-in clears the flag). See `AccountPurgeService`.
   */
  async scheduleDeletion(userId: string): Promise<void> {
    const { db } = this.dbService
    const [user] = await db
      .update(users)
      .set({ deletionScheduledAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    await db.delete(sessions).where(eq(sessions.userId, userId))
    this.logger.log(`Scheduled deletion of account ${userId}`)
    if (user?.email) {
      await this.notify(user.email, {
        kind: 'deletionScheduled',
        lang: userMailLang(user),
        values: { days: String(this.env.ACCOUNT_DELETION_GRACE_DAYS) },
        link: this.siteUrl('/')
      })
    }
  }

  private siteUrl(path: string): string {
    return `${new URL(this.env.PUBLIC_SITE_URL).origin}${path}`
  }

  /** Notices are best-effort: a mail outage must not break the action that triggered them. */
  async notify(to: string, props: Parameters<MailService['sendNotice']>[1]): Promise<void> {
    try {
      await this.mail.sendNotice(to, props)
    } catch (err) {
      this.logger.warn(`Notice "${props.kind}" not sent: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async upsertGoogleUser(identity: GoogleIdentity): Promise<UserRow> {
    return this.dbService.db.transaction(async tx => {
      // Signing in cancels a pending account deletion (grace period).
      const profile = {
        name: identity.name,
        avatarUrl: identity.picture,
        lastLoginAt: new Date(),
        deletionScheduledAt: null
      }
      const [linked] = await tx
        .select({ userId: authIdentities.userId })
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'google'), eq(authIdentities.subject, identity.subject)))
        .limit(1)

      if (linked) {
        const [user] = await tx.update(users).set(profile).where(eq(users.id, linked.userId)).returning()
        if (user) return user
      }

      // New Google identity: attach it to an existing account with the same (verified) email, or create one.
      const [user] = await tx
        .insert(users)
        .values({ email: identity.email, ...profile })
        .onConflictDoUpdate({ target: users.email, set: profile })
        .returning()
      if (!user) throw new Error('User upsert returned no row')
      await tx
        .insert(authIdentities)
        .values({ provider: 'google', subject: identity.subject, userId: user.id, email: identity.email })
        .onConflictDoNothing()
      return user
    })
  }

  /** Linked strictly by Telegram id — there is no email to match on, so a Telegram login never merges into a Google account. */
  private async upsertTelegramUser(identity: TelegramIdentity): Promise<UserRow> {
    return this.dbService.db.transaction(async tx => {
      const profile = {
        name: identity.name,
        avatarUrl: identity.picture,
        lastLoginAt: new Date(),
        deletionScheduledAt: null
      }
      const [linked] = await tx
        .select({ userId: authIdentities.userId })
        .from(authIdentities)
        .where(and(eq(authIdentities.provider, 'telegram'), eq(authIdentities.subject, identity.subject)))
        .limit(1)

      if (linked) {
        const [user] = await tx.update(users).set(profile).where(eq(users.id, linked.userId)).returning()
        if (user) return user
      }

      const [user] = await tx.insert(users).values(profile).returning()
      if (!user) throw new Error('User insert returned no row')
      await tx.insert(authIdentities).values({ provider: 'telegram', subject: identity.subject, userId: user.id })
      return user
    })
  }

  /** The mailbox was proven by the code/link, so it is verified: attach to the account with this email or create one. */
  private async upsertEmailUser(email: string, lang: string): Promise<UserRow> {
    return this.dbService.db.transaction(async tx => {
      const profile = { lastLoginAt: new Date(), lang, deletionScheduledAt: null }
      const [user] = await tx
        .insert(users)
        .values({ email, ...profile })
        .onConflictDoUpdate({ target: users.email, set: profile })
        .returning()
      if (!user) throw new Error('User upsert returned no row')
      await tx
        .insert(authIdentities)
        .values({ provider: 'email', subject: email, userId: user.id, email })
        .onConflictDoNothing()
      return user
    })
  }

  /**
   * Creates a session (fresh random token → no fixation) and records the browser. A sign-in from a browser this account
   * has not used before — on an account that already had one — mails a "new sign-in" notice.
   */
  async issueSession(user: UserRow, ctx: ClientContext, method: string): Promise<SignInResult> {
    const { db } = this.dbService
    const token = newSessionToken()
    const deviceId = ctx.deviceId ?? newDeviceId()
    const deviceHash = hashDeviceId(deviceId)

    await db.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      userId: user.id,
      userAgent: ctx.userAgent?.slice(0, 300) ?? null,
      method,
      deviceHash,
      expiresAt: new Date(Date.now() + this.sessionTtlMs)
    })
    // Opportunistic cleanup instead of a cron job: sign-ins are rare, the index makes this cheap.
    await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`))

    const [known] = await db
      .select({ deviceHash: knownDevices.deviceHash })
      .from(knownDevices)
      .where(and(eq(knownDevices.userId, user.id), eq(knownDevices.deviceHash, deviceHash)))
      .limit(1)
    const [others] = await db.select({ n: count() }).from(knownDevices).where(eq(knownDevices.userId, user.id))
    await db
      .insert(knownDevices)
      .values({ userId: user.id, deviceHash })
      .onConflictDoUpdate({ target: [knownDevices.userId, knownDevices.deviceHash], set: { lastSeenAt: new Date() } })

    if (!known && (others?.n ?? 0) > 0 && user.email) {
      void this.notify(user.email, {
        kind: 'newSignIn',
        lang: userMailLang(user),
        values: {
          device: describeDevice(ctx.userAgent),
          time: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
        },
        link: this.siteUrl('/profile#devices')
      })
    }
    return { user: toSessionUser(user), token, deviceId }
  }
}
