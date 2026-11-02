import { Inject, Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { SHARE_ORIGINAL_TTL_MINUTES } from '@carplates/shared'

import { loadEnv } from '../env.js'
import { SharesRepository } from './shares.repository.js'
import { SHARE_OBJECT_STORE } from './types.js'
import type { ShareObjectStore } from './types.js'

const EXPIRY_INTERVAL_MS = 24 * 60 * 60 * 1000
const BATCH = 500
/** Unblurred uploads live as long as the share dialog could plausibly stay open. */
const ORIGINAL_SWEEP_INTERVAL_MS = 15 * 60 * 1000

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
  private sweepTimer: NodeJS.Timeout | null = null

  constructor(
    @Inject(SharesRepository) private readonly repo: SharesRepository,
    @Inject(SHARE_OBJECT_STORE) private readonly store: ShareObjectStore
  ) {}

  onModuleInit(): void {
    if (loadEnv().NODE_ENV === 'test') return
    void this.expire()
    this.timer = setInterval(() => void this.expire(), EXPIRY_INTERVAL_MS)
    this.timer.unref()
    void this.sweepOriginals()
    this.sweepTimer = setInterval(() => void this.sweepOriginals(), ORIGINAL_SWEEP_INTERVAL_MS)
    this.sweepTimer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.sweepTimer) clearInterval(this.sweepTimer)
  }

  /** Deletes every expired or revoked share (objects first, then rows, so a failure is retried tomorrow); returns how many rows went. */
  async expire(): Promise<number> {
    let total = 0
    try {
      for (;;) {
        const due = await this.repo.listDue(BATCH)
        if (!due.length) break
        const deletable: string[] = []
        for (const { id, objectKey, originalKey } of due) {
          try {
            await this.store.delete(objectKey)
            if (originalKey) await this.store.delete(originalKey)
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

  /**
   * Privacy backstop: the unblurred upload of a dialog that was abandoned (tab killed, no cancel call) goes after
   * `SHARE_ORIGINAL_TTL_MINUTES`. Rows whose object could not be deleted keep their key and are retried next run.
   */
  async sweepOriginals(): Promise<number> {
    let cleared = 0
    try {
      const stale = await this.repo.listStaleOriginals(
        new Date(Date.now() - SHARE_ORIGINAL_TTL_MINUTES * 60_000),
        BATCH
      )
      const done: string[] = []
      for (const { id, originalKey } of stale) {
        try {
          await this.store.delete(originalKey)
          done.push(id)
        } catch (err) {
          this.logger.warn(`Original delete failed: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      await this.repo.clearOriginals(done)
      cleared = done.length
    } catch (err) {
      this.logger.warn(`Original sweep failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    return cleared
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
