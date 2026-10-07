import { Inject, Injectable, Logger } from '@nestjs/common'
import { usageEvents } from '@carplates/db'
import { PAID_FEATURES, USAGE_KINDS, adminStatsResponseSchema } from '@carplates/shared'
import type { AdminStatsResponse, UsageKind } from '@carplates/shared'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

type UsageEventInput = { kind: UsageKind; lang: string | null; found: boolean | null; signedIn: boolean }

const SEARCH_KINDS = sql`('plate_search', 'vin_search', 'photo_search')`

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name)

  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Fire-and-forget: a failed counter must never fail the request it describes. */
  record(event: UsageEventInput): void {
    this.dbService.db
      .insert(usageEvents)
      .values(event)
      .catch((err: unknown) => this.logger.warn(`usage event dropped: ${String(err)}`))
  }

  async stats(): Promise<AdminStatsResponse> {
    const db = this.dbService.db
    const [totals, windows, daily, languages, split, optIns] = await Promise.all([
      db.execute<{ users: number; new7d: number; active7d: number; favorites: number }>(sql`
        SELECT (SELECT count(*) FROM app.users)::float8 AS users,
               (SELECT count(*) FROM app.users WHERE created_at > now() - interval '7 days')::float8 AS new7d,
               (SELECT count(*) FROM app.users WHERE last_login_at > now() - interval '7 days')::float8 AS active7d,
               (SELECT count(*) FROM app.user_saved_entries WHERE list = 'favorite' AND NOT deleted)::float8 AS favorites`),
      db.execute<{ kind: UsageKind; d1: number; d7: number; d30: number }>(sql`
        SELECT kind,
               count(*) FILTER (WHERE at > now() - interval '1 day')::float8 AS d1,
               count(*) FILTER (WHERE at > now() - interval '7 days')::float8 AS d7,
               count(*)::float8 AS d30
        FROM app.usage_events WHERE at > now() - interval '30 days' GROUP BY kind`),
      db.execute<{ day: string; searches: number; not_found: number; logins: number }>(sql`
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
               count(e.*) FILTER (WHERE e.kind IN ${SEARCH_KINDS})::float8 AS searches,
               count(e.*) FILTER (WHERE e.kind IN ${SEARCH_KINDS} AND e.found = false)::float8 AS not_found,
               count(e.*) FILTER (WHERE e.kind = 'login')::float8 AS logins
        FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS d
        LEFT JOIN app.usage_events e ON (e.at AT TIME ZONE 'UTC')::date = d::date AND e.at > now() - interval '31 days'
        GROUP BY d ORDER BY d`),
      db.execute<{ lang: string; count: number }>(sql`
        SELECT coalesce(lang, '?') AS lang, count(*)::float8 AS count FROM app.usage_events
        WHERE kind IN ${SEARCH_KINDS} AND at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      db.execute<{ signed_in: number; anonymous: number }>(sql`
        SELECT count(*) FILTER (WHERE signed_in)::float8 AS signed_in, count(*) FILTER (WHERE NOT signed_in)::float8 AS anonymous
        FROM app.usage_events WHERE kind IN ${SEARCH_KINDS} AND at > now() - interval '30 days'`),
      db.execute<{ feature: string; users: number }>(sql`
        SELECT feature, count(*)::float8 AS users FROM app.user_features WHERE enabled GROUP BY feature`)
    ])

    const t = totals.rows[0]
    const byKind = new Map(windows.rows.map(w => [w.kind, w]))
    const byFeature = new Map(optIns.rows.map(o => [o.feature, o.users]))
    return adminStatsResponseSchema.parse({
      totals: { users: t?.users ?? 0, newUsers7d: t?.new7d ?? 0, activeUsers7d: t?.active7d ?? 0, favorites: t?.favorites ?? 0 },
      windows: USAGE_KINDS.map(kind => ({
        kind,
        d1: byKind.get(kind)?.d1 ?? 0,
        d7: byKind.get(kind)?.d7 ?? 0,
        d30: byKind.get(kind)?.d30 ?? 0
      })),
      daily: daily.rows.map(r => ({ day: r.day, searches: r.searches, notFound: r.not_found, logins: r.logins })),
      languages: languages.rows.map(r => ({ lang: r.lang, count: r.count })),
      signedInSearches30d: split.rows[0]?.signed_in ?? 0,
      anonymousSearches30d: split.rows[0]?.anonymous ?? 0,
      featureOptIns: PAID_FEATURES.map(feature => ({ feature, users: byFeature.get(feature) ?? 0 }))
    })
  }
}
