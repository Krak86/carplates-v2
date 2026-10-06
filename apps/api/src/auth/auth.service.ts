import { Inject, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { authIdentities, sessions, users } from '@carplates/db'
import type { UserRow } from '@carplates/db'
import { USER_ROLES } from '@carplates/shared'
import type { SessionUser } from '@carplates/shared'
import { and, eq, gt, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv } from '../env.js'

import { GoogleIdTokenVerifier, InvalidIdTokenError } from './google-id-token.js'
import type { GoogleIdentity } from './google-id-token.js'
import { hashSessionToken, newSessionToken } from './session-cookie.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    role: USER_ROLES.find(r => r === row.role) ?? 'user',
    createdAt: row.createdAt.toISOString()
  }
}

export type SignInResult = { user: SessionUser; token: string }

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly env = loadEnv()
  private readonly google = this.env.GOOGLE_CLIENT_ID ? new GoogleIdTokenVerifier(this.env.GOOGLE_CLIENT_ID) : null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  get googleClientId(): string | null {
    return this.env.GOOGLE_CLIENT_ID ?? null
  }

  get sessionTtlMs(): number {
    return this.env.SESSION_TTL_DAYS * DAY_MS
  }

  async signInWithGoogle(credential: string, userAgent: string | undefined): Promise<SignInResult> {
    if (!this.google) throw new ServiceUnavailableException('Google sign-in is not configured')
    let identity: GoogleIdentity
    try {
      identity = await this.google.verify(credential)
    } catch (err) {
      if (err instanceof InvalidIdTokenError) {
        this.logger.warn(err.message)
        throw new UnauthorizedException('Invalid Google credential')
      }
      throw err
    }
    const user = await this.upsertGoogleUser(identity)
    const token = await this.createSession(user.id, userAgent)
    return { user: toSessionUser(user), token }
  }

  /** The user behind a session token, extending the session when it is past half its lifetime; null if none/expired. */
  async userForToken(token: string): Promise<SessionUser | null> {
    const { db } = this.dbService
    const tokenHash = hashSessionToken(token)
    const [row] = await db
      .select({ user: users, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, sql`now()`)))
      .limit(1)
    if (!row) return null

    if (row.expiresAt.getTime() - Date.now() < this.sessionTtlMs / 2) {
      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + this.sessionTtlMs) })
        .where(eq(sessions.tokenHash, tokenHash))
    }
    return toSessionUser(row.user)
  }

  async signOut(token: string): Promise<void> {
    await this.dbService.db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)))
  }

  /** Removes the user and — via ON DELETE CASCADE — their identities, sessions and feature opt-ins. */
  async deleteAccount(userId: string): Promise<void> {
    await this.dbService.db.delete(users).where(eq(users.id, userId))
    this.logger.log(`Deleted account ${userId}`)
  }

  private async upsertGoogleUser(identity: GoogleIdentity): Promise<UserRow> {
    return this.dbService.db.transaction(async tx => {
      const profile = { name: identity.name, avatarUrl: identity.picture, lastLoginAt: new Date() }
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

  private async createSession(userId: string, userAgent: string | undefined): Promise<string> {
    const { db } = this.dbService
    const token = newSessionToken()
    await db.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      userId,
      userAgent: userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + this.sessionTtlMs)
    })
    // Opportunistic cleanup instead of a cron job: sign-ins are rare, the index makes this cheap.
    await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`))
    return token
  }
}
