import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { digestSends, users } from '@carplates/db'
import { RELEASES } from '@carplates/shared/releases'
import type { SessionUser } from '@carplates/shared'
import type { ReleaseItem } from '@carplates/shared/releases'
import { and, count, eq, isNotNull, isNull, notExists, notInArray, sql } from 'drizzle-orm'

import { userMailLang } from '../auth/auth.service.js'
import { DbService } from '../db/db.service.js'
import { authSecret, loadEnv } from '../env.js'
import { MailService } from '../mail/mail.service.js'
import { renderDigestMail } from '../mail/render.js'
import type { Lang } from '../spa/spa-text.js'

import { buildDigest, isSendWindow, previousPeriod } from './digest-content.js'
import type { Digest, DigestPeriod } from './digest-content.js'
import { createUnsubscribeToken } from './unsubscribe-token.js'

const TICK_INTERVAL_MS = 30 * 60_000
const BATCH_SIZE = 50
/** Resend's default limit is 2 requests per second; stay well under it. */
const SEND_GAP_MS = 600
const LOCALES: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' }

export type DigestStatus = {
  period: string
  /** `false` = the month shipped no new feature, nothing would be sent. */
  hasContent: boolean
  features: number
  optedIn: number
  alreadySent: number
  enabled: boolean
}

type Recipient = { id: string; email: string; lang: string | null }

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** The users the digest may go to: verified email, opted in, not on their way out. */
const eligible = and(eq(users.marketingOptIn, true), isNotNull(users.email), isNull(users.deletionScheduledAt))

/**
 * Monthly "what's new" mail to opted-in users. On the 1st (Kyiv time, from 09:00; a 3-day catch-up window) it summarises
 * the previous month's `RELEASES` and sends nothing if that month had no `new` item. Each (month, user) is claimed in
 * `app.digest_sends` before sending, so a second API instance, a restart or the hourly retry never double-sends.
 */
@Injectable()
export class DigestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DigestService.name)
  private readonly env = loadEnv()
  private timer: NodeJS.Timeout | null = null
  private running = false
  private stopped = false

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(MailService) private readonly mail: MailService
  ) {}

  onModuleInit(): void {
    if (this.env.NODE_ENV === 'test' || !this.env.DIGEST_ENABLED) return
    void this.tick()
    this.timer = setInterval(() => void this.tick(), TICK_INTERVAL_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
  }

  /** One scheduler pass: inside the send window, (re)tries last month's digest. Never throws. */
  async tick(now = new Date()): Promise<void> {
    if (this.running || !isSendWindow(now)) return
    this.running = true
    try {
      const digest = buildDigest(RELEASES, previousPeriod(now))
      if (!digest) return
      const sent = await this.sendDigest(digest)
      if (sent) this.logger.log(`Monthly digest ${digest.period.period}: sent ${String(sent)} mail(s)`)
    } catch (err) {
      this.logger.warn(`Monthly digest failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      this.running = false
    }
  }

  /** Sends the digest to every eligible user who has not been claimed for it yet; returns how many went out. */
  async sendDigest(digest: Digest): Promise<number> {
    const { db } = this.dbService
    const period = digest.period.period
    const failed: string[] = []
    let sent = 0

    while (!this.stopped) {
      const batch: Recipient[] = await db
        .select({ id: users.id, email: sql<string>`${users.email}`, lang: users.lang })
        .from(users)
        .where(
          and(
            eligible,
            notExists(
              db
                .select({ one: sql`1` })
                .from(digestSends)
                .where(and(eq(digestSends.userId, users.id), eq(digestSends.period, period)))
            ),
            failed.length ? notInArray(users.id, failed) : undefined
          )
        )
        .limit(BATCH_SIZE)
      if (!batch.length) break

      for (const user of batch) {
        const claimed = await db
          .insert(digestSends)
          .values({ period, userId: user.id })
          .onConflictDoNothing()
          .returning({ userId: digestSends.userId })
        if (!claimed.length) continue // another instance took it

        try {
          await this.sendTo(user, digest)
          sent += 1
        } catch (err) {
          // Release the claim so the next tick retries this user; skip them for the rest of this run.
          await db.delete(digestSends).where(and(eq(digestSends.userId, user.id), eq(digestSends.period, period)))
          failed.push(user.id)
          this.logger.warn(`Digest to ${user.id} failed: ${err instanceof Error ? err.message : String(err)}`)
        }
        await sleep(SEND_GAP_MS)
      }
    }
    return sent
  }

  /** Renders and sends the digest to one address, with the one-click unsubscribe headers. */
  async sendTo(user: Recipient, digest: Digest): Promise<void> {
    const lang = userMailLang(user)
    const site = new URL(this.env.PUBLIC_SITE_URL).origin
    const token = createUnsubscribeToken(authSecret(this.env), user.id)
    const rendered = await renderDigestMail({
      lang,
      month: monthLabel(digest.period, lang),
      features: digest.features.map(f => f[lang]),
      counts: { improved: digest.improved, data: digest.data, fix: digest.fix },
      releasesUrl: `${site}/releases`,
      unsubscribeUrl: `${site}/unsubscribe#t=${token}`
    })
    await this.mail.send({
      to: user.email,
      ...rendered,
      from: this.env.MAIL_FROM_NEWS ?? this.env.MAIL_FROM,
      headers: {
        'List-Unsubscribe': `<${site}/api/digest/unsubscribe/one-click?t=${token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })
  }

  /** Admin "send me a test": last month's digest (or a sample when empty) to the admin's own address, never logged as sent. */
  async sendTest(admin: SessionUser, now = new Date()): Promise<{ sentTo: string | null }> {
    if (!admin.email) return { sentTo: null }
    const period = previousPeriod(now)
    const digest = buildDigest(RELEASES, period) ?? sampleDigest(period)
    await this.sendTo({ id: admin.id, email: admin.email, lang: null }, digest)
    return { sentTo: admin.email }
  }

  async status(now = new Date()): Promise<DigestStatus> {
    const { db } = this.dbService
    const period = previousPeriod(now)
    const digest = buildDigest(RELEASES, period)
    const [optedIn] = await db.select({ n: count() }).from(users).where(eligible)
    const [alreadySent] = await db.select({ n: count() }).from(digestSends).where(eq(digestSends.period, period.period))
    return {
      period: period.period,
      hasContent: !!digest,
      features: digest?.features.length ?? 0,
      optedIn: optedIn?.n ?? 0,
      alreadySent: alreadySent?.n ?? 0,
      enabled: this.env.DIGEST_ENABLED
    }
  }

  /** Switches the digest on or off for one user. Opting in stamps when consent was given; opting out keeps that record. */
  async setSubscription(userId: string, optIn: boolean): Promise<void> {
    await this.dbService.db
      .update(users)
      .set(optIn ? { marketingOptIn: true, marketingOptInAt: sql`now()` } : { marketingOptIn: false })
      .where(eq(users.id, userId))
  }
}

function sampleDigest(period: DigestPeriod): Digest {
  const item = (en: string): ReleaseItem => ({ group: 'new' as const, ua: en, ru: en, en })
  return {
    period,
    features: [item('Sample feature (no new feature was released that month)')],
    improved: 0,
    data: 0,
    fix: 0
  }
}

/** "жовтень 2026" / "October 2026": month and year formatted apart so uk-UA does not append "р.". */
function monthLabel(period: DigestPeriod, lang: Lang): string {
  const [year, month] = period.period.split('-').map(Number)
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1))
  const name = new Intl.DateTimeFormat(LOCALES[lang], { month: 'long', timeZone: 'UTC' }).format(date)
  return `${name} ${String(year)}`
}
