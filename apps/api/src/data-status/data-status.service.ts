import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { statsDataSpan } from '@carplates/db'
import { dataStatusResponseSchema } from '@carplates/shared'
import type { DataStatusResponse } from '@carplates/shared'

import { DbService } from '../db/db.service.js'

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
    const [span, runs] = await Promise.all([
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
        ORDER BY r.job, r.started_at DESC`)
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
      }))
    })
  }
}
