import { Inject, Injectable } from '@nestjs/common'
import { sharedPhotos } from '@carplates/db'
import type { PlateCandidate } from '@carplates/shared'
import { and, asc, count, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import type { NewShare, ShareRecord } from './types.js'

type Row = typeof sharedPhotos.$inferSelect

const toRecord = (row: Row): ShareRecord => ({
  id: row.id,
  userId: row.userId,
  objectKey: row.objectKey,
  plate: row.plate,
  candidates: row.candidates as PlateCandidate[],
  bytes: row.bytes,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  revokedAt: row.revokedAt
})

/** Not expired and not revoked: what counts against the caps. */
const active = and(isNull(sharedPhotos.revokedAt), sql`${sharedPhotos.expiresAt} > now()`)

/** All SQL of `app.shared_photos`; the service holds the rules. */
@Injectable()
export class SharesRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async countActive(userId: string): Promise<number> {
    const [row] = await this.dbService.db
      .select({ n: count() })
      .from(sharedPhotos)
      .where(and(eq(sharedPhotos.userId, userId), active))
    return row?.n ?? 0
  }

  async activeBytes(): Promise<number> {
    const [row] = await this.dbService.db
      .select({ n: sql<number>`coalesce(sum(${sharedPhotos.bytes}), 0)::double precision` })
      .from(sharedPhotos)
      .where(active)
    return row?.n ?? 0
  }

  /** Inserts unless the user already has `max` active shares (checked under a per-user advisory lock, so parallel uploads cannot both pass). */
  async insertUnderCap(share: NewShare, max: number): Promise<boolean> {
    return this.dbService.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${share.userId}, 0))`)
      const [row] = await tx
        .select({ n: count() })
        .from(sharedPhotos)
        .where(and(eq(sharedPhotos.userId, share.userId), active))
      if ((row?.n ?? 0) >= max) return false
      await tx.insert(sharedPhotos).values(share)
      return true
    })
  }

  async listActive(userId: string): Promise<ShareRecord[]> {
    const rows = await this.dbService.db
      .select()
      .from(sharedPhotos)
      .where(and(eq(sharedPhotos.userId, userId), active))
      .orderBy(desc(sharedPhotos.createdAt))
    return rows.map(toRecord)
  }

  /** The row for a token hash whatever its state; the service decides whether it is still live. */
  async findByTokenHash(tokenHash: string): Promise<ShareRecord | null> {
    const [row] = await this.dbService.db.select().from(sharedPhotos).where(eq(sharedPhotos.tokenHash, tokenHash))
    return row ? toRecord(row) : null
  }

  /** Deletes one of the user's own shares and returns it (for its object key), or `null` when it is not theirs / gone. */
  async deleteOwned(userId: string, id: string): Promise<ShareRecord | null> {
    const [row] = await this.dbService.db
      .delete(sharedPhotos)
      .where(and(eq(sharedPhotos.id, id), eq(sharedPhotos.userId, userId)))
      .returning()
    return row ? toRecord(row) : null
  }

  /** Rows past `expires_at` or revoked, oldest first. */
  async listDue(limit: number): Promise<{ id: string; objectKey: string }[]> {
    return this.dbService.db
      .select({ id: sharedPhotos.id, objectKey: sharedPhotos.objectKey })
      .from(sharedPhotos)
      .where(or(lte(sharedPhotos.expiresAt, sql`now()`), sql`${sharedPhotos.revokedAt} is not null`))
      .orderBy(asc(sharedPhotos.expiresAt))
      .limit(limit)
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length) await this.dbService.db.delete(sharedPhotos).where(inArray(sharedPhotos.id, ids))
  }

  /** Deletes every row of the given users (account deletion) and returns the object keys to remove from storage. */
  async deleteOfUsers(userIds: string[]): Promise<string[]> {
    if (!userIds.length) return []
    const rows = await this.dbService.db
      .delete(sharedPhotos)
      .where(inArray(sharedPhotos.userId, userIds))
      .returning({ key: sharedPhotos.objectKey })
    return rows.map(r => r.key)
  }
}
