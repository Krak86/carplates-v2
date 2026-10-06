import { Inject, Injectable } from '@nestjs/common'
import { userFeatures, users } from '@carplates/db'
import { PAID_FEATURES } from '@carplates/shared'
import type { AdminUser, FeatureState, FeaturesUpdateRequest, PaidFeature } from '@carplates/shared'
import { desc, eq, sql } from 'drizzle-orm'

import { toSessionUser } from '../auth/auth.service.js'
import { DbService } from '../db/db.service.js'

const isPaidFeature = (value: string): value is PaidFeature => PAID_FEATURES.some(f => f === value)

@Injectable()
export class FeaturesService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** One entry per PAID_FEATURES member, in that order; never-touched features are off. */
  async list(userId: string): Promise<FeatureState[]> {
    const rows = await this.dbService.db.select().from(userFeatures).where(eq(userFeatures.userId, userId))
    const byFeature = new Map(rows.map(r => [r.feature, r]))
    return PAID_FEATURES.map(feature => {
      const row = byFeature.get(feature)
      return { feature, enabled: row?.enabled ?? false, updatedAt: row?.updatedAt.toISOString() ?? null }
    })
  }

  async update(userId: string, request: FeaturesUpdateRequest): Promise<FeatureState[]> {
    if (request.features.length) {
      await this.dbService.db
        .insert(userFeatures)
        .values(request.features.map(f => ({ userId, feature: f.feature, enabled: f.enabled })))
        .onConflictDoUpdate({
          target: [userFeatures.userId, userFeatures.feature],
          set: { enabled: sql`excluded.enabled`, updatedAt: sql`now()` },
          // Re-saving an unchanged toggle keeps its original timestamp (the admin view sorts by it).
          setWhere: sql`${userFeatures.enabled} IS DISTINCT FROM excluded.enabled`
        })
    }
    return this.list(userId)
  }

  /** Every account, newest first, with the features it has switched on — the admin page's "incoming" list. */
  async listUsers(): Promise<AdminUser[]> {
    const rows = await this.dbService.db
      .select({
        user: users,
        features: sql<string[]>`coalesce(array_agg(${userFeatures.feature} ORDER BY ${userFeatures.feature})
          FILTER (WHERE ${userFeatures.enabled}), '{}')`,
        featuresUpdatedAt: sql<string | null>`max(${userFeatures.updatedAt})`
      })
      .from(users)
      .leftJoin(userFeatures, eq(userFeatures.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))

    return rows.map(r => ({
      ...toSessionUser(r.user),
      lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
      features: r.features.filter(isPaidFeature),
      featuresUpdatedAt: r.featuresUpdatedAt ? new Date(r.featuresUpdatedAt).toISOString() : null
    }))
  }
}
