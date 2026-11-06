import { z } from 'zod'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** The dates the registry data really covers (`registry.stats_data_span`); every field is null until the first `db:refresh-stats`. */
export const registrySpanSchema = z.object({
  firstDate: isoDateSchema.nullable(),
  /** Last registration action of any kind (VIN-only rows included). */
  lastDate: isoDateSchema.nullable()
})
export type RegistrySpan = z.infer<typeof registrySpanSchema>

/** The newest run of one scheduled ingest job (`registry.job_runs`) and the newest one that ended `ok`. */
export const jobStatusSchema = z.object({
  job: z.string(),
  lastStatus: z.string(),
  lastStartedAt: z.string(),
  lastOkAt: z.string().nullable()
})
export type JobStatus = z.infer<typeof jobStatusSchema>

/** One finished or running run of a scheduled job. */
export const jobRunSchema = z.object({
  job: z.string(),
  status: z.string(),
  startedAt: z.string()
})
export type JobRun = z.infer<typeof jobRunSchema>

/**
 * GET /api/data-status: the live half of the "Data status" page. The list of datasets, their cadence and the manual refresh dates
 * are static in the web app; only what the server alone knows (the real registry span and the cron run log) travels here.
 * Lives here, not in schemas.ts, whose hash busts users' offline caches.
 */
export const dataStatusResponseSchema = z.object({
  registry: registrySpanSchema,
  jobs: z.array(jobStatusSchema),
  /** Newest record date inside each source (dataset id -> ISO date), for the sources whose rows carry one; `null` while empty. */
  latest: z.record(z.string(), isoDateSchema.nullable()).default({}),
  /** Rows held per source (dataset id -> count); a source without a table of its own is absent. */
  counts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** The most recent runs of every scheduled job, newest first. */
  history: z.array(jobRunSchema).default([])
})
export type DataStatusResponse = z.infer<typeof dataStatusResponseSchema>
