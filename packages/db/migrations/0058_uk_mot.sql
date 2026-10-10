-- UK MOT "Common faults" (stage G): DVSA anonymised MOT results (OGL v3), aggregated while streaming the yearly ZIPs -
-- raw tests are never stored. Kinds: car / van / motorcycle (DVSA test class 4 / 7 / 1+2), normal tests only, mileage converted
-- to km and bucketed into bands (edges live in packages/shared/src/mot.ts, per kind). Re-ingestable (`pnpm ingest:mot`),
-- the tables are replaced as a whole because the counts are pooled over the loaded years.

-- Every stored make/model (the matcher's reference list), keyed like VehiclesDB / RDW: makeKey / modelKey.
CREATE TABLE registry.mot_keys (
  kind      text    NOT NULL,
  make_key  text    NOT NULL,
  model_key text    NOT NULL,
  make      text    NOT NULL,
  model     text    NOT NULL,
  tests     integer NOT NULL,
  PRIMARY KEY (kind, make_key, model_key)
);
CREATE INDEX ix_mot_keys_make ON registry.mot_keys (make_key);

-- Chart 1: normal tests / failed tests / tests with at least one advisory per model year and mileage band.
CREATE TABLE registry.mot_stats (
  kind        text     NOT NULL,
  make_key    text     NOT NULL,
  model_key   text     NOT NULL,
  model_year  smallint NOT NULL,
  band        smallint NOT NULL,
  tests       integer  NOT NULL,
  fails       integer  NOT NULL,
  advisories  integer  NOT NULL,
  PRIMARY KEY (kind, make_key, model_key, model_year, band)
);

-- Charts 2-3: per model and band (pooled over model years) the dangerous-fail count, per group [fails, advisories] and the
-- model's top specific reasons {code: [fails, advisories]}; counts are TESTS with the issue, never defect rows.
CREATE TABLE registry.mot_issues (
  kind       text     NOT NULL,
  make_key   text     NOT NULL,
  model_key  text     NOT NULL,
  band       smallint NOT NULL,
  tests      integer  NOT NULL,
  dangerous  integer  NOT NULL,
  groups     jsonb    NOT NULL,
  reasons    jsonb    NOT NULL,
  PRIMARY KEY (kind, make_key, model_key, band)
);

-- "UK average": the same figures over every model of a kind together (including models too small to be stored).
CREATE TABLE registry.mot_baseline (
  kind        text     NOT NULL,
  band        smallint NOT NULL,
  tests       integer  NOT NULL,
  fails       integer  NOT NULL,
  advisories  integer  NOT NULL,
  dangerous   integer  NOT NULL,
  groups      jsonb    NOT NULL,
  PRIMARY KEY (kind, band)
);

-- DVSA wording of the reasons that appear in mot_issues.reasons (English; translations live in the web i18n files).
CREATE TABLE registry.mot_reasons (
  code       text PRIMARY KEY,
  group_code text NOT NULL,
  item       text NOT NULL,
  fail_text  text NOT NULL,
  watch_text text NOT NULL
);

-- One row: which DVSA test years the counts pool.
CREATE TABLE registry.mot_meta (
  id        smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  year_from smallint NOT NULL,
  year_to   smallint NOT NULL,
  loaded_at timestamptz NOT NULL DEFAULT now()
);
