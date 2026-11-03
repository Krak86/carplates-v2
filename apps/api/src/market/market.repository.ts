import { Inject, Injectable } from '@nestjs/common'
import { marketBudget, marketCache, marketListing } from '@carplates/db'
import { eq, lt, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'
import type { BudgetDay, BudgetPatch, MarketStore } from './market-provider.js'

const ZERO: BudgetDay = { listUsed: 0, detailUsed: 0, cacheHits: 0, ua: 0, eu: 0 }
const CHUNK = 500

/** Postgres-backed `MarketStore`: cached answers, the `go/:id` allow-list and the UTC day's request counters. */
@Injectable()
export class MarketRepository implements MarketStore {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async getCache(key: string): Promise<{ payload: unknown; fetchedAt: Date } | null> {
    const [row] = await this.dbService.db
      .select({ payload: marketCache.payload, fetchedAt: marketCache.fetchedAt })
      .from(marketCache)
      .where(eq(marketCache.key, key))
    return row ?? null
  }

  async setCache(key: string, payload: unknown, at: Date): Promise<void> {
    await this.dbService.db
      .insert(marketCache)
      .values({ key, payload, fetchedAt: at })
      .onConflictDoUpdate({ target: marketCache.key, set: { payload, fetchedAt: at } })
  }

  async rememberListings(ids: string[], cacheKey: string, at: Date): Promise<void> {
    for (let i = 0; i < ids.length; i += CHUNK) {
      await this.dbService.db
        .insert(marketListing)
        .values(ids.slice(i, i + CHUNK).map(id => ({ id, cacheKey, seenAt: at })))
        .onConflictDoUpdate({ target: marketListing.id, set: { cacheKey, seenAt: at } })
    }
  }

  async hasListing(id: string): Promise<boolean> {
    const [row] = await this.dbService.db
      .select({ id: marketListing.id })
      .from(marketListing)
      .where(eq(marketListing.id, id))
    return !!row
  }

  async budget(day: string): Promise<BudgetDay> {
    const [row] = await this.dbService.db
      .select({
        listUsed: marketBudget.listUsed,
        detailUsed: marketBudget.detailUsed,
        cacheHits: marketBudget.cacheHits,
        ua: marketBudget.ua,
        eu: marketBudget.eu
      })
      .from(marketBudget)
      .where(eq(marketBudget.day, day))
    return row ?? ZERO
  }

  async bump(day: string, patch: BudgetPatch): Promise<void> {
    const add = { ...ZERO, ...patch }
    await this.dbService.db
      .insert(marketBudget)
      .values({ day, ...add })
      .onConflictDoUpdate({
        target: marketBudget.day,
        set: {
          listUsed: sql`${marketBudget.listUsed} + ${add.listUsed}`,
          detailUsed: sql`${marketBudget.detailUsed} + ${add.detailUsed}`,
          cacheHits: sql`${marketBudget.cacheHits} + ${add.cacheHits}`,
          ua: sql`${marketBudget.ua} + ${add.ua}`,
          eu: sql`${marketBudget.eu} + ${add.eu}`
        }
      })
  }

  async prune(before: Date): Promise<void> {
    await this.dbService.db.delete(marketCache).where(lt(marketCache.fetchedAt, before))
    await this.dbService.db.delete(marketListing).where(lt(marketListing.seenAt, before))
  }
}
