import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { users } from '@carplates/db'
import { and, isNotNull, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv } from '../env.js'

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Hard-deletes accounts whose "delete account" grace period has run out. Sign-in clears `deletion_scheduled_at`, so
 * anything still flagged after the grace period was never restored. ON DELETE CASCADE removes identities, sessions,
 * devices, favorites, settings and feature opt-ins with the user row.
 */
@Injectable()
export class AccountPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountPurgeService.name)
  private readonly graceDays = loadEnv().ACCOUNT_DELETION_GRACE_DAYS
  private timer: NodeJS.Timeout | null = null

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  onModuleInit(): void {
    if (loadEnv().NODE_ENV === 'test') return
    void this.purge()
    this.timer = setInterval(() => void this.purge(), PURGE_INTERVAL_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async purge(): Promise<number> {
    try {
      const deleted = await this.dbService.db
        .delete(users)
        .where(
          and(
            isNotNull(users.deletionScheduledAt),
            lt(users.deletionScheduledAt, sql`now() - make_interval(days => ${this.graceDays})`)
          )
        )
        .returning({ id: users.id })
      if (deleted.length) this.logger.log(`Purged ${deleted.length} account(s) past the deletion grace period`)
      return deleted.length
    } catch (err) {
      this.logger.warn(`Account purge failed: ${err instanceof Error ? err.message : String(err)}`)
      return 0
    }
  }
}
