import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { statsDataSpan } from '@carplates/db'
import { dataStatusResponseSchema } from '@carplates/shared'
import type { DataStatusResponse } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

type LatestRow = { id: string; last_date: string | null }
type JobRow = { job: string; status: string; started_at: Date | string; ok_at: Date | string | null }

const iso = (value: Date | string): string => new Date(value).toISOString()

/** A `WITH NO DATA` view throws (Postgres 55000) instead of returning zero rows until its first refresh. */
const isUnpopulated = (error: unknown): boolean => {
  const cause = (error as { cause?: { code?: string } } | null)?.cause
  return (error as { code?: string } | null)?.code === '55000' || cause?.code === '55000'
}

@Injectable()
export class DataStatusService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** The registry's real date span plus the newest run of every job that ever ran (`registry.job_runs`). */
  async get(): Promise<DataStatusResponse> {
    const db = this.dbService.db
    const [span, runs, latest] = await Promise.all([
      db
        .select()
        .from(statsDataSpan)
        .limit(1)
        .catch((error: unknown) => {
          if (isUnpopulated(error)) return []
          throw error
        }),
      db.execute<JobRow>(sql`
        SELECT DISTINCT ON (r.job) r.job, r.status, r.started_at,
          (SELECT max(o.finished_at) FROM registry.job_runs o WHERE o.job = r.job AND o.status = 'ok') AS ok_at
        FROM registry.job_runs r
        ORDER BY r.job, r.started_at DESC`),
      // Dates after today are typos in the source; month-granular sources (dtpPatrol) report the first day of their last month.
      db.execute<LatestRow>(sql`
        SELECT 'wanted' AS id, to_char(max(seized_at) FILTER (WHERE seized_at <= current_date), 'YYYY-MM-DD') AS last_date FROM registry.wanted_vehicles
        UNION ALL SELECT 'wantedPlates', to_char(max(seized_at) FILTER (WHERE seized_at <= current_date), 'YYYY-MM-DD') FROM registry.wanted_plates
        UNION ALL SELECT 'losses', to_char(max(day) FILTER (WHERE day <= current_date), 'YYYY-MM-DD') FROM registry.war_losses_daily
        UNION ALL SELECT 'news', to_char(max(published_at) FILTER (WHERE published_at <= now()), 'YYYY-MM-DD') FROM registry.news_items
        UNION ALL SELECT 'social', to_char(max(published_at) FILTER (WHERE published_at <= now()), 'YYYY-MM-DD') FROM registry.social_posts
        UNION ALL SELECT 'dtpPatrol', to_char(max(make_date(year, period, 1)), 'YYYY-MM-DD') FROM registry.dtp_region_year
        UNION ALL SELECT 'rdwRecalls', to_char(max(published_at) FILTER (WHERE published_at <= current_date), 'YYYY-MM-DD') FROM registry.rdw_recalls
        UNION ALL SELECT 'caRecalls', to_char(max(recalled_at) FILTER (WHERE recalled_at <= current_date), 'YYYY-MM-DD') FROM registry.ca_recalls`)
    ])
    return dataStatusResponseSchema.parse({
      registry: {
        firstDate: span[0]?.firstDate ?? null,
        lastDate: span[0]?.lastDate ?? null
      },
      jobs: runs.rows.map(r => ({
        job: r.job,
        lastStatus: r.status,
        lastStartedAt: iso(r.started_at),
        lastOkAt: r.ok_at ? iso(r.ok_at) : null
      })),
      latest: { plates: span[0]?.lastDate ?? null, ...Object.fromEntries(latest.rows.map(r => [r.id, r.last_date])) }
    })
  }
}
