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

/** Dataset id (see the web `datasets.ts`) -> the `registry` tables it lives in; counts of several tables are summed. Fixed identifiers, never user input. */
const COUNT_TABLES: Readonly<Record<string, readonly string[]>> = {
  wanted: ['wanted_vehicles'],
  wantedPlates: ['wanted_plates'],
  auctions: ['auction_lots'],
  prozorroAuctions: ['prozorro_auctions'],
  auctionProceedings: ['auction_proceedings'],
  losses: ['war_losses_daily'],
  dream: ['dream_projects'],
  news: ['news_items'],
  social: ['social_posts'],
  dtpPatrol: ['dtp_region_year'],
  dtpHazards: ['dtp_hazard_section'],
  rdwRecalls: ['rdw_recalls'],
  caRecalls: ['ca_recalls'],
  euroncap: ['euroncap_ratings'],
  jncap: ['jncap_ratings'],
  cncap: ['cncap_ratings'],
  kncap: ['kncap_ratings'],
  iihs: ['iihs_ratings'],
  vehiclesdb: ['vdb_models'],
  rdwSpecs: ['rdw_specs'],
  fuel: ['fuel_economy'],
  reviews: ['topgear_reviews', 'press_reviews'],
  videos: ['car_videos', 'youtube_videos', 'site_videos'],
  wikiImages: ['wiki_image'],
  wikiPaint: ['wiki_image_paint'],
  models3d: ['car_models_3d', 'car_models_360', 'winner_360'],
  generations: ['model_generations'],
  wikispecs: ['model_spec_wiki'],
  mot: ['mot_stats'],
  origin: ['wmi_prefix'],
  openEv: ['open_ev'],
  tuning3d: ['tuning_links'],
  oemLinks: ['oem_links'],
  alarmHistory: ['alarm_history_daily']
}

@Injectable()
export class DataStatusService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** Row counts per dataset. `registrations` (millions of rows) uses the planner estimate; a failing table is just left out. */
  private async counts(): Promise<Record<string, number>> {
    const db = this.dbService.db
    const countOf = async (table: string): Promise<number> => {
      const res = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM registry.${table}`))
      return Number(res.rows[0]?.n ?? 0)
    }
    const entries = await Promise.all([
      db
        .execute<{ n: string }>(
          sql`SELECT greatest(reltuples, 0)::bigint::text AS n FROM pg_class WHERE oid = 'registry.registrations'::regclass`
        )
        .then(res => ['plates', Number(res.rows[0]?.n ?? 0)] as const)
        .catch(() => null),
      ...Object.entries(COUNT_TABLES).map(([id, tables]) =>
        Promise.all(tables.map(countOf))
          .then(parts => [id, parts.reduce((a, b) => a + b, 0)] as const)
          .catch(() => null)
      )
    ])
    return Object.fromEntries(entries.filter(e => e !== null))
  }

  /** The registry's real date span plus the newest run of every job that ever ran (`registry.job_runs`). */
  async get(): Promise<DataStatusResponse> {
    const db = this.dbService.db
    const [span, runs, latest, counts, history] = await Promise.all([
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
        UNION ALL SELECT 'dream', to_char(max(updated_at) FILTER (WHERE updated_at <= now()), 'YYYY-MM-DD') FROM registry.dream_projects
        UNION ALL SELECT 'news', to_char(max(published_at) FILTER (WHERE published_at <= now()), 'YYYY-MM-DD') FROM registry.news_items
        UNION ALL SELECT 'social', to_char(max(published_at) FILTER (WHERE published_at <= now()), 'YYYY-MM-DD') FROM registry.social_posts
        UNION ALL SELECT 'dtpPatrol', to_char(max(make_date(year, period, 1)), 'YYYY-MM-DD') FROM registry.dtp_region_year
        UNION ALL SELECT 'rdwRecalls', to_char(max(published_at) FILTER (WHERE published_at <= current_date), 'YYYY-MM-DD') FROM registry.rdw_recalls
        UNION ALL SELECT 'caRecalls', to_char(max(recalled_at) FILTER (WHERE recalled_at <= current_date), 'YYYY-MM-DD') FROM registry.ca_recalls`),
      this.counts(),
      db.execute<{ job: string; status: string; started_at: Date | string }>(sql`
        SELECT job, status, started_at FROM registry.job_runs ORDER BY started_at DESC LIMIT 40`)
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
      latest: { plates: span[0]?.lastDate ?? null, ...Object.fromEntries(latest.rows.map(r => [r.id, r.last_date])) },
      counts,
      history: history.rows.map(r => ({ job: r.job, status: r.status, startedAt: iso(r.started_at) }))
    })
  }
}
