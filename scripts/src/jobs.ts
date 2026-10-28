/** Scheduled ingest jobs (SCHEDULE.md). The crontab (`infra/vps/ingest.cron`) only says WHEN; what runs and its time limit live here. */

export type Job = {
  /** Shell command, run from `scripts/` (the ingest image has `tsx` on PATH). */
  command: string
  /** Hard limit; the process group is killed past it and the run is logged `timeout`. */
  timeoutMin: number
}

export const JOBS = {
  news: { command: 'tsx src/news.ts', timeoutMin: 15 },
  social: { command: 'tsx src/social.ts', timeoutMin: 20 },
  wanted: { command: 'tsx src/wanted.ts', timeoutMin: 15 },
  // Real work ~monthly (new CKAN month); other runs no-op after one API call. /archive = /opt/carsua/archive on the host.
  plates: { command: 'tsx src/ingest-full.ts --archive /archive', timeoutMin: 360 }
} as const satisfies Record<string, Job>

export type JobName = keyof typeof JOBS

export function isJobName(name: string): name is JobName {
  return Object.hasOwn(JOBS, name)
}

/** Env var holding a job's healthchecks.io ping URL: `plates` -> `HC_PING_PLATES`. */
export function pingEnvVar(job: string): string {
  return `HC_PING_${job.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
}
