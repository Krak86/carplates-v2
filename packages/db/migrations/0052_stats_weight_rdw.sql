-- stats_weight now ranks models by their EU type-approval unladen mass (registry own_weight is full of typos: 1 kg,
-- 141 t), so a row is one RDW-matched model: `n` = Ukrainian passenger cars of it, `min_kg` / `max_kg` = RDW's lightest /
-- heaviest unladen mass over well-sampled years. Rebuilt by scripts/src/weight-stats.ts (needs rdw_specs).
DROP TABLE registry.stats_weight;

CREATE TABLE registry.stats_weight (
  brand text NOT NULL,
  model text NOT NULL,
  n integer NOT NULL,
  min_kg real NOT NULL,
  max_kg real NOT NULL,
  PRIMARY KEY (brand, model)
);
