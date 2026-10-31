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
  // Garpun wanted plates (~20 k rows, seconds): after `wanted` (04:40); a skipped day loses resolved history like `wanted`.
  'wanted-plates': { command: 'tsx src/wanted-plates.ts', timeoutMin: 10 },
  // SETAM auction lots (newest 2 monthly CSVs, ~1 000 vehicle lots, seconds). Idempotent and nothing is lost on a skipped day (lots
  // are snapshots, a later run catches up); the first VPS run needs `--all` once for the history (SCHEDULE.md).
  auctions: { command: 'tsx src/auctions.ts', timeoutMin: 15 },
  // Patrol Police road-crash XLSX (docs/road-safety-plan.md): a new NN.YYYY.xlsx appears monthly; a year is replaced in one transaction and a
  // run with nothing newer rewrites the same numbers. Hazardous-section CSVs (data.gov.ua) change about once a year. Re-export the seed CSVs
  // locally after a real change (pnpm export:dtp:csv).
  'dtp-patrol': { command: 'tsx src/dtp-patrol.ts', timeoutMin: 20 },
  'dtp-hazards': { command: 'tsx src/dtp.ts', timeoutMin: 20 },
  // Real work ~monthly (new CKAN month; ~2-3 h, a first load on an empty ingested_resources ~6 h); other runs no-op after one
  // API call (ingest-full.ts). /archive = /opt/carsua/archive on the host.
  plates: { command: 'tsx src/ingest-full.ts --archive /archive', timeoutMin: 720 },
  // Manual only (no cron entry): `run-ingest.sh catalog` rebuilds the catalog_* tables (15-25 min on the real registry; the tables are
  // replaced in one transaction at the end, so a timeout leaves the previous catalog intact), e.g. after changing catalog-overrides.csv.
  catalog: { command: 'tsx src/catalog-build.ts', timeoutMin: 60 }
} as const satisfies Record<string, Job>

export type JobName = keyof typeof JOBS

export function isJobName(name: string): name is JobName {
  return Object.hasOwn(JOBS, name)
}

/** Env var holding a job's healthchecks.io ping URL: `plates` -> `HC_PING_PLATES`. */
export function pingEnvVar(job: string): string {
  return `HC_PING_${job.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
}
