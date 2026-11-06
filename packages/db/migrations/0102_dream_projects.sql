-- Recovery projects from DREAM (dream.gov.ua public API, Open Contracting Data Standard), one row per project, copied so the
-- /alarms "Recovery" view survives an upstream outage. `oblast_code` = first 4 characters of the KATOTTG code of the project's first
-- location (e.g. UA51 = Odesa oblast); `committed_uah` = sum of the project's finance lines with status 'committed' (UAH only).
-- New table only: backward-compatible with the previous api colour (blue/green).
CREATE TABLE registry.dream_projects (
  id text PRIMARY KEY,
  code text NOT NULL,
  status text NOT NULL,
  project_type text,
  purpose text,
  title text,
  oblast_code text,
  committed_uah numeric(18, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_dream_projects_oblast ON registry.dream_projects (oblast_code);
CREATE INDEX ix_dream_projects_updated ON registry.dream_projects (updated_at);
