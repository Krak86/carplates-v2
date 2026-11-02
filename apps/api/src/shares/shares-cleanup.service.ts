import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { loadEnv } from '../env.js'
import { SharesRepository } from './shares.repository.js'
import { SHARE_OBJECT_STORE } from './types.js'
import type { ShareObjectStore } from './types.js'

const EXPIRY_INTERVAL_MS = 24 * 60 * 60 * 1000
const BATCH = 500

/**
 * Removes shared photos for good: the daily expiry job (rows past `expires_at` or revoked) and account deletion.
 * Lives in a global module so `AuthService` / `AccountPurgeService` can use it without importing the shares feature.
 * Rows go first (the link stops working at once); a failed object delete is logged and left to the bucket's lifecycle
 * rule (8 days), the backstop for exactly this.
 */
@Injectable()
export class SharesCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SharesCleanupService.name)
  private timer: NodeJS.Timeout | null = null

  constructor(
    @Inject(SharesRepository) private readonly repo: SharesRepository,
    @Inject(SHARE_OBJECT_STORE) private readonly store: ShareObjectStore
  ) {}

  onModuleInit(): void {
    if (loadEnv().NODE_ENV === 'test') return
    void this.expire()
    this.timer = setInterval(() => void this.expire(), EXPIRY_INTERVAL_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /** Deletes every expired or revoked share (objects first, then rows, so a failure is retried tomorrow); returns how many rows went. */
  async expire(): Promise<number> {
    let total = 0
    try {
      for (;;) {
        const due = await this.repo.listDue(BATCH)
        if (!due.length) break
        const deletable: string[] = []
        for (const { id, objectKey } of due) {
          try {
            await this.store.delete(objectKey)
            deletable.push(id)
          } catch (err) {
            this.logger.warn(`Share object delete failed: ${err instanceof Error ? err.message : String(err)}`)
          }
        }
        await this.repo.deleteByIds(deletable)
        total += deletable.length
        // A batch where nothing could be deleted would loop forever; the next daily run retries it.
        if (deletable.length < due.length) break
      }
      if (total) this.logger.log(`Deleted ${total} expired shared photo(s)`)
    } catch (err) {
      this.logger.warn(`Share expiry failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    return total
  }

  /** Account deletion: drops the users' shares (rows, then objects best-effort). Never throws, so it cannot block the deletion. */
  async deleteForUsers(userIds: string[]): Promise<void> {
    try {
      const keys = await this.repo.deleteOfUsers(userIds)
      for (const key of keys) {
        try {
          await this.store.delete(key)
        } catch (err) {
          this.logger.warn(`Share object delete failed: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } catch (err) {
      this.logger.warn(
        `Deleting shares of removed accounts failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
