import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { authIdentities, sessions, users } from '@carplates/db'
import type { UserRow } from '@carplates/db'
import { EMAIL_IN_USE } from '@carplates/shared'
import type {
  EmailStartResponse,
  LinkableProvider,
  ReauthResponse,
  SessionInfo,
  SessionUser,
  SignInMethodsResponse,
  TelegramSignInRequest,
  UiLang
} from '@carplates/shared'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

import { AuthService, toSessionUser, userMailLang } from './auth.service.js'
import type { ResolvedSession, SignInResult } from './auth.service.js'
import type { ClientContext } from './client-context.js'
import { describeDevice } from './email-challenge.js'
import { EmailChallengeService } from './email-challenge.service.js'
import { hashSessionToken } from './session-cookie.js'

/** Everything behind `/profile`: sign-in methods, devices, re-authentication, change email, link / unlink providers. */
@Injectable()
export class AccountSecurityService {
  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(EmailChallengeService) private readonly challenges: EmailChallengeService
  ) {}

  // ── Overview ────────────────────────────────────────────────────────────────

  async methods(userId: string): Promise<SignInMethodsResponse> {
    const { db } = this.dbService
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    const identities = await db.select().from(authIdentities).where(eq(authIdentities.userId, userId))
    const google = identities.find(i => i.provider === 'google')
    const telegram = identities.find(i => i.provider === 'telegram')
    return {
      email: user?.email ?? null,
      google: google ? { email: google.email, linkedAt: google.createdAt.toISOString() } : null,
      telegram: telegram ? { linkedAt: telegram.createdAt.toISOString() } : null
    }
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const rows = await this.dbService.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, sql`now()`)))
      .orderBy(desc(sessions.lastSeenAt))
    return rows.map(row => ({
      id: row.id,
      device: describeDevice(row.userAgent),
      method: row.method,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      current: row.id === currentSessionId
    }))
  }

  /** Always scoped to the caller's own sessions — a foreign id simply matches nothing. */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.dbService.db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.id, sessionId)))
  }

  async revokeOtherSessions(userId: string, keepTokenHash: string): Promise<void> {
    await this.dbService.db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, keepTokenHash)))
  }

  // ── Re-authentication (sudo mode) ───────────────────────────────────────────

  async startEmailReauth(user: SessionUser, lang: UiLang, ctx: ClientContext): Promise<EmailStartResponse> {
    if (!user.email) throw new BadRequestException('This account has no email; re-authenticate with Telegram')
    return this.challenges.start({
      email: user.email,
      purpose: 'reauth',
      userId: user.id,
      lang,
      device: describeDevice(ctx.userAgent)
    })
  }

  async completeEmailReauth(session: ResolvedSession, challengeId: string, code: string): Promise<ReauthResponse> {
    const challenge = await this.challenges.verifyCode(challengeId, code, 'reauth')
    this.assertOwned(challenge.userId, session.user.id)
    return this.touchAuth(session.tokenHash)
  }

  async reauthWithGoogle(session: ResolvedSession, credential: string): Promise<ReauthResponse> {
    const identity = await this.auth.verifyGoogle(credential)
    await this.assertIdentityOwned(session.user.id, 'google', identity.subject)
    return this.touchAuth(session.tokenHash)
  }

  async reauthWithTelegram(session: ResolvedSession, payload: TelegramSignInRequest): Promise<ReauthResponse> {
    const identity = this.auth.verifyTelegram(payload)
    await this.assertIdentityOwned(session.user.id, 'telegram', identity.subject)
    return this.touchAuth(session.tokenHash)
  }

  // ── Email on the account ────────────────────────────────────────────────────

  async startSetEmail(user: SessionUser, email: string, lang: UiLang, ctx: ClientContext): Promise<EmailStartResponse> {
    return this.challenges.start({
      email,
      purpose: 'set_email',
      userId: user.id,
      lang,
      device: describeDevice(ctx.userAgent)
    })
  }

  /**
   * The mailbox is proven → attach it. Whether another account already owns the address is only revealed here, after
   * the proof, so a signed-in user cannot probe which addresses are registered. The session is rotated.
   */
  async completeSetEmail(
    session: ResolvedSession,
    challengeId: string,
    code: string,
    ctx: ClientContext
  ): Promise<SignInResult> {
    const challenge = await this.challenges.verifyCode(challengeId, code, 'set_email')
    this.assertOwned(challenge.userId, session.user.id)
    const newEmail = challenge.email
    const previousEmail = session.user.email

    const updated = await this.dbService.db.transaction(async tx => {
      const [taken] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, newEmail), ne(users.id, session.user.id)))
        .limit(1)
      if (taken) throw new ConflictException(EMAIL_IN_USE)

      const [row] = await tx
        .update(users)
        .set({ email: newEmail, lang: challenge.lang })
        .where(eq(users.id, session.user.id))
        .returning()
      if (!row) throw new ForbiddenException('Account not found')
      await tx
        .delete(authIdentities)
        .where(and(eq(authIdentities.userId, row.id), eq(authIdentities.provider, 'email')))
      await tx
        .insert(authIdentities)
        .values({ provider: 'email', subject: newEmail, userId: row.id, email: newEmail })
        .onConflictDoNothing()
      return row
    })

    if (previousEmail && previousEmail !== newEmail) {
      await this.auth.notify(previousEmail, {
        kind: 'emailChanged',
        lang: userMailLang(updated),
        values: { email: newEmail },
        link: null
      })
    }
    return this.rotateSession(updated, ctx)
  }

  // ── Linked providers ────────────────────────────────────────────────────────

  async linkGoogle(userId: string, credential: string): Promise<void> {
    const identity = await this.auth.verifyGoogle(credential)
    await this.link(userId, 'google', identity.subject, identity.email)
  }

  async linkTelegram(userId: string, payload: TelegramSignInRequest): Promise<void> {
    const identity = this.auth.verifyTelegram(payload)
    await this.link(userId, 'telegram', identity.subject, null)
  }

  /** Removes a linked provider, but never the last way back in (the account email counts as one). */
  async unlink(userId: string, provider: LinkableProvider, keepTokenHash: string): Promise<void> {
    const { db } = this.dbService
    const methods = await this.methods(userId)
    const remaining =
      (methods.email ? 1 : 0) +
      (provider === 'google' ? 0 : methods.google ? 1 : 0) +
      (provider === 'telegram' ? 0 : methods.telegram ? 1 : 0)
    if (remaining === 0) throw new ConflictException('This is your only sign-in method')
    await db.delete(authIdentities).where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider)))
    await this.revokeOtherSessions(userId, keepTokenHash)
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private async link(userId: string, provider: LinkableProvider, subject: string, email: string | null): Promise<void> {
    const { db } = this.dbService
    const [existing] = await db
      .select({ userId: authIdentities.userId })
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, provider), eq(authIdentities.subject, subject)))
      .limit(1)
    if (existing && existing.userId !== userId) {
      throw new ConflictException('That account is already linked to another profile')
    }
    // One identity per provider per user: relinking replaces the old one.
    await db.delete(authIdentities).where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider)))
    await db.insert(authIdentities).values({ provider, subject, userId, email })
  }

  private async assertIdentityOwned(userId: string, provider: LinkableProvider, subject: string): Promise<void> {
    const [row] = await this.dbService.db
      .select({ userId: authIdentities.userId })
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, provider), eq(authIdentities.subject, subject)))
      .limit(1)
    if (row?.userId !== userId) throw new ForbiddenException('That sign-in does not belong to this account')
  }

  private assertOwned(challengeUserId: string | null, userId: string): void {
    if (challengeUserId !== userId) throw new ForbiddenException('That code was issued for another account')
  }

  private async touchAuth(tokenHash: string): Promise<ReauthResponse> {
    const authAt = new Date()
    await this.dbService.db.update(sessions).set({ authAt }).where(eq(sessions.tokenHash, tokenHash))
    return { authAt: authAt.toISOString() }
  }

  /** New token for this browser, every other session ended (session-fixation rule for credential changes). */
  private async rotateSession(user: UserRow, ctx: ClientContext): Promise<SignInResult> {
    const result = await this.auth.issueSession(user, ctx, 'email')
    await this.dbService.db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, hashSessionToken(result.token))))
    return { ...result, user: toSessionUser(user) }
  }
}
