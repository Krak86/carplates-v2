-- KNCAP (Korea, run by MOLIT/KoROAD) crash-test ratings, scraped from kncap.org's own
-- JSON results catalog (POST /ncs/KncapResult/selectInitList.json — see
-- scripts/src/kncap.ts) and persisted here — same rationale as
-- registry.euroncap_ratings/jncap_ratings/cncap_ratings: no stable per-request API
-- contract to rely on, so re-running the ingest is how this stays fresh.
--
-- KNCAP's own data is Korean-only (company/model names) — see scripts/src/kncap-names.ts
-- for the curated idx -> {make, model} translation table this ingest depends on. Unlike
-- C-NCAP, KNCAP does publish a star rating (1-5) per category alongside each category's
-- percentage, plus an overall 1-5 tier ("등급") and, for some cars, a 0-100 overall score
-- (nullable — not every tested car has one published).
--
-- Scraped from the site's "current results" catalog only (2021 onward) — that catalog's
-- own "include old data" checkbox makes no difference server-side, and KNCAP's results
-- search doesn't expose anything older through this endpoint. See PLAN.md's KNCAP section
-- for what a historical (pre-2021) recovery would need (a separate per-record detail-page
-- brute-force, confirmed feasible but not yet built).

CREATE TABLE registry.kncap_ratings (
  assessment_id text PRIMARY KEY,
  idx integer NOT NULL,
  -- Matching keys — see packages/shared/src/vehicleKey.ts, same functions
  -- Euro NCAP/JNCAP/C-NCAP's matching uses. The scraper and the API's lookup both
  -- derive these the same way, so they must always agree.
  make text NOT NULL,
  model text NOT NULL,
  make_key text NOT NULL,
  model_key text NOT NULL,
  -- The source's own Korean text ("연도 제작사 모델"), kept for display (helps a viewer
  -- sanity-check a match) and for re-deriving the translation table against future scrapes.
  name_ko text NOT NULL,
  rating_year integer,
  overall_score real,
  overall_class smallint,
  crash_pct real,
  crash_star smallint,
  pedestrian_pct real,
  pedestrian_star smallint,
  accident_pct real,
  accident_star smallint,
  image_url text,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_kncap_make_model ON registry.kncap_ratings (make_key, model_key);
