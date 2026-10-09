-- Unladen-weight rollup for the /stats heaviest / lightest model boards and their result-card chips: one row per
-- distinct (brand, model) of registered passenger cars, with the car count `n` and the mean registry own_weight (kg).
-- Rebuilt in full by `pnpm db:refresh-weight-stats` (scripts/src/weight-stats.ts, pure SQL), which also runs in
-- `db:refresh-derived`. A plain table, not a matview, so it matches the other stats_* derived rollups.

CREATE TABLE registry.stats_weight (
  brand text NOT NULL,
  model text NOT NULL,
  n integer NOT NULL,
  avg_weight_kg real NOT NULL,
  PRIMARY KEY (brand, model)
);
