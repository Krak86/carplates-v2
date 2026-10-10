-- stats_model_grouped: stats_by_model with ZAZ / Daewoo / Chevrolet spellings of one model folded into a family row
-- (`modelFamily` in @carplates/shared; Lanos alone is 63 raw pairs). Every other pair is copied as-is. Raw rows stay in
-- stats_by_model; this table backs only the /stats top-models leaderboard. Rebuilt from stats_by_model (no registry scan) by
-- scripts/src/model-family-stats.ts. Folded counts are sums, so a plate typed under two spellings counts twice.
CREATE TABLE registry.stats_model_grouped (
  brand text NOT NULL,
  model text NOT NULL,
  total_rows bigint NOT NULL,
  distinct_plates bigint NOT NULL,
  distinct_vins bigint NOT NULL,
  PRIMARY KEY (brand, model)
);

CREATE INDEX stats_model_grouped_plates_idx ON registry.stats_model_grouped (distinct_plates DESC);
