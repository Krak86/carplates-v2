-- stats_weight per vehicle group (passenger / truck / bus / motorcycle / trailer / other): `source` says where the edge
-- masses come from — 'rdw' (year-medians of the matched RDW model, passenger cars only) or 'registry' (1st / 99th
-- percentile of the model's registry own_weight, checked against total_weight). Rebuilt by scripts/src/weight-stats.ts.
DROP TABLE registry.stats_weight;

CREATE TABLE registry.stats_weight (
  kind_group text NOT NULL,
  source text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  n integer NOT NULL,
  min_kg real NOT NULL,
  max_kg real NOT NULL,
  PRIMARY KEY (kind_group, brand, model)
);
