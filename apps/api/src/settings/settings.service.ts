import { Inject, Injectable } from '@nestjs/common'
import { userSettings } from '@carplates/db'
import { userSettingsSchema } from '@carplates/shared'
import type { SettingsResponse, SettingsUpdateRequest } from '@carplates/shared'
import { eq, sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** Client clocks drift; an edit dated further ahead than this is clamped so it can't win every future conflict. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

@Injectable()
export class SettingsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  async get(userId: string): Promise<SettingsResponse> {
    const [row] = await this.dbService.db.select().from(userSettings).where(eq(userSettings.userId, userId))
    if (!row) return { document: null }
    // A row written by an older/newer schema version that no longer parses counts as "nothing saved".
    const settings = userSettingsSchema.safeParse(row.data)
    return { document: settings.success ? { settings: settings.data, updatedAt: row.updatedAt } : null }
  }

  /** Last write wins: the stored document is replaced only by a strictly newer one (ties keep the stored one). */
  async put(userId: string, request: SettingsUpdateRequest): Promise<SettingsResponse> {
    const updatedAt = Math.min(request.updatedAt, Date.now() + MAX_CLOCK_SKEW_MS)
    await this.dbService.db
      .insert(userSettings)
      .values({ userId, data: request.settings, updatedAt })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { data: sql`excluded.data`, updatedAt: sql`excluded.updated_at` },
        setWhere: sql`excluded.updated_at > ${userSettings.updatedAt}`
      })
    return this.get(userId)
  }
}
