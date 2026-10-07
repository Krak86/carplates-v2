import { Inject, Injectable } from '@nestjs/common'
import { userSavedEntries } from '@carplates/db'
import { FAVORITES_LIMIT, HISTORY_LIMIT, SYNC_TOMBSTONE_TTL_MS } from '@carplates/shared'
import type { SyncEntry, SyncRequest, SyncResponse } from '@carplates/shared'
import { and, eq, inArray, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type List = 'favorite' | 'history'
const LIST_LIMITS: Record<List, number> = { favorite: FAVORITES_LIMIT, history: HISTORY_LIMIT }
type Row = typeof userSavedEntries.$inferSelect

/** Client clocks drift; a write dated further ahead than this is clamped so it can't win every future conflict. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

export const toSyncEntry = (row: Row): SyncEntry => ({
  kind: row.kind === 'vin' ? 'vin' : 'plate',
  value: row.value,
  label: row.label,
  date: row.date,
  ...(row.found === null ? {} : { found: row.found }),
  ...(row.tags?.length ? { tags: row.tags } : {}),
  ...(row.deleted ? { deleted: true } : {})
})

@Injectable()
export class SyncService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /**
   * Last-write-wins merge per (list, kind, value): the entry with the newer `date` survives (ties keep the stored
   * one), a deletion is a tombstone competing on the same terms. Afterwards each list is trimmed to the newest
   * its limit of live entries — the oldest are tombstoned so every device drops them too — and tombstones
   * past their TTL are purged. Returns the whole merged state so the client converges in one round trip.
   */
  async sync(userId: string, request: SyncRequest): Promise<SyncResponse> {
    const now = Date.now()

    return this.dbService.db.transaction(async tx => {
      const incoming = (list: List, entries: SyncEntry[]) =>
        entries.map(e => ({
          userId,
          list,
          kind: e.kind,
          value: e.value,
          label: e.label,
          found: e.found ?? null,
          tags: list === 'favorite' && e.tags?.length ? e.tags : null,
          date: Math.min(e.date, now + MAX_CLOCK_SKEW_MS),
          deleted: e.deleted ?? false
        }))
      const values = [...incoming('favorite', request.favorites), ...incoming('history', request.history)]

      if (values.length) {
        await tx
          .insert(userSavedEntries)
          .values(values)
          .onConflictDoUpdate({
            target: [userSavedEntries.userId, userSavedEntries.list, userSavedEntries.kind, userSavedEntries.value],
            set: {
              label: sql`excluded.label`,
              found: sql`excluded.found`,
              tags: sql`excluded.tags`,
              date: sql`excluded.date`,
              deleted: sql`excluded.deleted`
            },
            setWhere: sql`excluded.date > ${userSavedEntries.date}`
          })
      }

      let evictedFavorites = 0
      for (const list of ['favorite', 'history'] as const) {
        const excess = await tx
          .select({ kind: userSavedEntries.kind, value: userSavedEntries.value })
          .from(userSavedEntries)
          .where(
            and(
              eq(userSavedEntries.userId, userId),
              eq(userSavedEntries.list, list),
              eq(userSavedEntries.deleted, false)
            )
          )
          .orderBy(sql`${userSavedEntries.date} DESC`)
          .offset(LIST_LIMITS[list])
        if (!excess.length) continue
        if (list === 'favorite') evictedFavorites = excess.length

        await tx
          .update(userSavedEntries)
          .set({ deleted: true, date: now })
          .where(
            and(
              eq(userSavedEntries.userId, userId),
              eq(userSavedEntries.list, list),
              inArray(
                sql`(${userSavedEntries.kind}, ${userSavedEntries.value})`,
                excess.map(e => sql`(${e.kind}, ${e.value})`)
              )
            )
          )
      }

      await tx
        .delete(userSavedEntries)
        .where(
          and(
            eq(userSavedEntries.userId, userId),
            eq(userSavedEntries.deleted, true),
            lt(userSavedEntries.date, now - SYNC_TOMBSTONE_TTL_MS)
          )
        )

      const rows = await tx.select().from(userSavedEntries).where(eq(userSavedEntries.userId, userId))
      return {
        favorites: rows.filter(r => r.list === 'favorite').map(toSyncEntry),
        history: rows.filter(r => r.list === 'history').map(toSyncEntry),
        evictedFavorites
      }
    })
  }
}
