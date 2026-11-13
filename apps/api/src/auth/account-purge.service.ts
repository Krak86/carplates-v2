import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { users } from '@carplates/db'
import { and, inArray, isNotNull, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import { loadEnv, sharesStorageConfigured } from '../env.js'
import { SharesCleanupService } from '../shares/shares-cleanup.service.js'
import { SHARE_OBJECT_STORE } from '../shares/types.js'
import type { ShareObjectStore } from '../shares/types.js'

/** Ledger object per purged account (a UUID, no PII), read by infra/vps/restore-replay-deletions.sh after a restore. */
export const deletionLedgerKey = (userId: string): string => `deleted/${userId}`

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Hard-deletes accounts whose "delete account" grace period has run out. Sign-in clears `deletion_scheduled_at`, so
 * anything still flagged after the grace period was never restored. ON DELETE CASCADE removes identities, sessions,
 * devices, favorites, settings, feature opt-ins and shared-photo rows with the user row; the shared photos' stored
 * objects are removed first (they are normally gone already: scheduling the deletion removes them). Each purged id is
 * written to R2 `deleted/<uuid>` so a database restore can re-apply the deletion (docs/deploy.md "Restore from R2").
 */
@Injectable()
export class AccountPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountPurgeService.name)
  private readonly graceDays = loadEnv().ACCOUNT_DELETION_GRACE_DAYS
  private timer: NodeJS.Timeout | null = null

  constructor(
    @Inject(DbService) private readonly dbService: DbService,
    @Inject(SharesCleanupService) private readonly shares: SharesCleanupService,
    @Inject(SHARE_OBJECT_STORE) private readonly store: ShareObjectStore
  ) {}

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
      const due = await this.dbService.db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            isNotNull(users.deletionScheduledAt),
            lt(users.deletionScheduledAt, sql`now() - make_interval(days => ${this.graceDays})`)
          )
        )
      const ids = due.map(u => u.id)
      if (!ids.length) return 0
      await this.shares.deleteForUsers(ids)
      // Ledger first: if it cannot be written the rows stay and the next run retries, so a restore can never resurrect a purge.
      if (sharesStorageConfigured(loadEnv())) {
        const at = Buffer.from(new Date().toISOString())
        for (const id of ids) await this.store.put(deletionLedgerKey(id), at, 'text/plain')
      }
      const deleted = await this.dbService.db.delete(users).where(inArray(users.id, ids)).returning({ id: users.id })
      if (deleted.length) this.logger.log(`Purged ${deleted.length} account(s) past the deletion grace period`)
      return deleted.length
    } catch (err) {
      this.logger.warn(`Account purge failed: ${err instanceof Error ? err.message : String(err)}`)
      return 0
    }
  }
}
