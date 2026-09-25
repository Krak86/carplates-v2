-- JNCAP (Japan New Car Assessment Program, run by NASVA) crash-test ratings,
-- scraped from nasva.go.jp's English mirror (see scripts/src/jncap.ts) and
-- persisted here — same rationale as registry.euroncap_ratings: no public
-- API, so there's nothing to call per-request. One row per tested assessment.
--
-- JNCAP's test taxonomy has changed substantially across FY2003-2025 (an
-- older simple frontal/side/pole percentage scheme, later replaced by many
-- more "Preventive Safety Performance" sub-tests scored as levels) — rather
-- than a fixed column per metric that would break across eras, the full
-- label->value breakdown is kept as-is in `test_scores`, and only the fields
-- stable across every era (stars, rank, overall/category percentages, links)
-- are first-class columns.

CREATE TABLE registry.jncap_ratings (
  assessment_id text PRIMARY KEY,
  url text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  -- Matching keys — see packages/shared/src/vehicleKey.ts, same functions
  -- Euro NCAP's matching uses. The scraper and the API's lookup both derive
  -- these the same way, so they must always agree.
  make_key text NOT NULL,
  model_key text NOT NULL,
  vehicle_type text,
  rating_year integer,
  stars smallint,
  overall_pct smallint,
  preventive_rank text,
  preventive_pct smallint,
  collision_rank text,
  collision_pct smallint,
  emergency_call_type text,
  emergency_call_pct smallint,
  -- Raw ordered label->value breakdown, e.g. [{"label": "Offset frontal", "value": "Level 4/5"}, ...].
  test_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Media stays as source URLs/ids only — hotlinked (image) or embedded via
  -- YouTube's own player (video), never downloaded or rehosted.
  image_url text,
  youtube_id text,
  report_pdf_url text,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_jncap_make_model ON registry.jncap_ratings (make_key, model_key);
