-- C-NCAP (China, run by CATARC) crash-test ratings, scraped from c-ncap.org.cn's
-- own JSON API (see scripts/src/cncap.ts) and persisted here — same rationale as
-- registry.euroncap_ratings/jncap_ratings: no stable per-request API contract to
-- rely on, so re-running the ingest is how this stays fresh.
--
-- C-NCAP's own data is Chinese-only (brand/model names, category labels) — see
-- scripts/src/cncap-names.ts for the curated carId -> {make, model} translation
-- table this ingest depends on. The protocol also changed scoring shape in 2018:
-- 2006-2018 reports a single raw-points score (no fixed maximum, not comparable
-- across years); 2018-onward reports a clean percentage across three sub-scores
-- (occupant protection, pedestrian/VRU protection, active safety). `score_unit`
-- records which shape a given row is so the UI never treats points as a percent.
-- Unlike Euro NCAP/JNCAP, C-NCAP has no star rating at all — the source's own
-- site only ever shows scores.

CREATE TABLE registry.cncap_ratings (
  assessment_id text PRIMARY KEY,
  car_id integer NOT NULL,
  -- Matching keys — see packages/shared/src/vehicleKey.ts, same functions
  -- Euro NCAP/JNCAP's matching uses. The scraper and the API's lookup both
  -- derive these the same way, so they must always agree.
  make text NOT NULL,
  model text NOT NULL,
  make_key text NOT NULL,
  model_key text NOT NULL,
  -- The source's own Chinese text, kept for display (helps a viewer sanity-check
  -- a match) and for re-deriving the translation table against future dumps.
  name_zh text NOT NULL,
  manufacturer_zh text,
  vehicle_class text,
  rating_year integer,
  score_unit text NOT NULL CHECK (score_unit IN ('pct', 'points')),
  overall_score real,
  occupant_score real,
  vru_score real,
  active_safety_score real,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_cncap_make_model ON registry.cncap_ratings (make_key, model_key);
