-- IIHS (US, insurance-industry-funded, distinct from NHTSA) crash-test ratings, scraped from
-- iihs.org's own server-rendered vehicle detail pages (see scripts/src/iihs.ts) and persisted
-- here — same rationale as registry.euroncap_ratings/jncap_ratings/cncap_ratings/kncap_ratings:
-- no stable per-request API contract to rely on (the only JSON endpoint, /api/ratings/variant-
-- lookup, gives make/model/year existence, never the actual ratings), so re-running the ingest
-- is how this stays fresh.
--
-- The full sitemap.xml lists every vehicle detail page directly (confirmed live 2026-09-26,
-- 6,023 pages across 660 make/variant combos, model years 1994-2027) — no search-API sweep
-- needed to discover the vehicle universe, unlike a from-scratch crawl would require.
--
-- IIHS's own tested-criteria set changes by era (small-overlap front split by seat starting
-- around 2012, "updated" vs. "original" moderate-overlap/side tests from the mid-2010s
-- redesign, roof strength and head restraints only tested through the original-test era,
-- pedestrian front crash prevention only from the 2019+ redesign) — so, unlike the fixed-column
-- shape of euroncap/jncap/cncap/kncap, each assessment's test results are stored as a jsonb
-- array of {key, label, rating, qualifier} rather than one column per test. Same pattern as
-- registry.jncap_ratings' own `test_scores` jsonb column.

CREATE TABLE registry.iihs_ratings (
  -- The scraped page's own URL path ("honda/accord-4-door-sedan/2026") — stable, unique, and
  -- doubles as the "full report" link with no extra construction needed.
  assessment_id text PRIMARY KEY,
  -- Matching keys — see packages/shared/src/vehicleKey.ts, same functions
  -- Euro NCAP/JNCAP/C-NCAP/KNCAP's matching uses. The scraper and the API's lookup both derive
  -- these the same way, so they must always agree.
  make text NOT NULL,
  model text NOT NULL,
  make_key text NOT NULL,
  model_key text NOT NULL,
  -- IIHS's own body-style/segment text ("4-door sedan", "midsize car") — used by the API's
  -- body-style filter (mirrors NHTSA's, see SafetyRatings.helpers.ts) and shown in the UI.
  variant_type text NOT NULL,
  vehicle_class text,
  model_year integer NOT NULL,
  -- "TSP" / "TSP+" (Top Safety Pick / Top Safety Pick+), null when the model year won no award.
  award text,
  -- {key, label, rating, qualifier}[] — see migration header comment for why this isn't
  -- fixed columns. `rating` is IIHS's own word (Good/Acceptable/Marginal/Poor, or
  -- Superior/Advanced/Basic for crash-prevention tests), null if the test wasn't performed.
  tests jsonb NOT NULL DEFAULT '[]',
  image_url text,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_iihs_make_model ON registry.iihs_ratings (make_key, model_key);
