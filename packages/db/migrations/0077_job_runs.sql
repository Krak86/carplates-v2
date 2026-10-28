-- Run log of the scheduled ingest jobs (scripts/src/run-job.ts, SCHEDULE.md). Backward compatible (blue/green): new table only.
CREATE TABLE registry.job_runs (
  id          bigserial PRIMARY KEY,
  job         text        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text        NOT NULL DEFAULT 'running', -- running | ok | failed | timeout | abandoned
  exit_code   integer,
  error       text
);

CREATE INDEX ix_job_runs_job_started ON registry.job_runs (job, started_at DESC);
