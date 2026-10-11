-- stats_spec: the /stats "highest / lowest" model boards for passenger-car specs other than mass. One row per
-- (metric, brand, model): `min_val` / `max_val` are the model's edge values in the metric's unit (power_kw kW,
-- displacement_cc cc, height_mm / length_mm mm, fuel_tank_l litres). `source` = 'registry' (1st / 99th percentile of the
-- registry column), 'rdw' (min / max of RDW year-medians) or 'wiki' (min / max over the Wikipedia generations).
-- Rebuilt by scripts/src/spec-stats.ts.
CREATE TABLE registry.stats_spec (
  metric  text NOT NULL,
  source  text NOT NULL,
  brand   text NOT NULL,
  model   text NOT NULL,
  n       integer NOT NULL,
  min_val real NOT NULL,
  max_val real NOT NULL,
  PRIMARY KEY (metric, brand, model)
);
