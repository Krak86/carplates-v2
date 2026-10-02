-- Crash-rating statistics rollup for the /safety page: one row per distinct (brand, model, make_year) of registered
-- passenger cars, with the registration count `n` and the combined 0-100 crash score of the Euro NCAP / JNCAP /
-- C-NCAP / KNCAP / IIHS ratings that apply to that group (null = no source rated a similar car). `*_score` keep each
-- source's own normalized score for drill-down; `score` is their equal-weight mean over the `sources` that had one.
-- Rebuilt in full by `pnpm db:refresh-safety-stats` (scripts/src/safety-stats.ts), which uses the shared matcher
-- (packages/shared/src/crashScore.ts) — so it has to be re-run after any registry or *_ratings change. A plain table,
-- not a matview, because the matching and score normalization are TypeScript, not SQL.

CREATE TABLE registry.stats_safety (
  brand text NOT NULL,
  model text NOT NULL,
  make_year integer NOT NULL,
  n integer NOT NULL,
  score real,
  sources smallint NOT NULL DEFAULT 0,
  euroncap_score real,
  jncap_score real,
  cncap_score real,
  kncap_score real,
  iihs_score real
);

CREATE INDEX ix_stats_safety_year ON registry.stats_safety (make_year);
CREATE INDEX ix_stats_safety_brand ON registry.stats_safety (brand);
