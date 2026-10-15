-- stats_distribution: histograms of the Ukrainian passenger-car fleet for the result card's "how does this car rank"
-- bars. One row per (metric, bucket): `bucket` is the lower edge of the bucket in the metric's unit (power_kw kW in 5s,
-- hp_per_tonne in 10s, displacement_cc cc in 100s), `n` the registered cars in it. Typos outside the metric's sane range
-- are left out. Rebuilt by scripts/src/spec-stats.ts (db:refresh-spec-stats, part of db:refresh-derived).
CREATE TABLE registry.stats_distribution (
  metric text NOT NULL,
  bucket integer NOT NULL,
  n      integer NOT NULL,
  PRIMARY KEY (metric, bucket)
);
