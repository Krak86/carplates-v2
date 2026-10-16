-- stats_ev: electrified passenger cars (registry fuel names electricity) per powertrain, model year, plate region and
-- model, for the /read/electric article. `powertrain` = 'bev' (fuel is electricity only) or 'hybrid' (electricity next to
-- petrol/diesel/gas — the registry does not split plug-in from self-charging hybrids). `region` is the plate-prefix region
-- (empty for legacy / region-less plates). `n` = current registrations. Rows with powertrain 'all' (empty brand / model)
-- hold the whole passenger fleet per year and region, for shares. Rebuilt by scripts/src/ev-stats.ts
-- (db:refresh-ev-stats, part of db:refresh-derived).
CREATE TABLE registry.stats_ev (
  powertrain text    NOT NULL,
  make_year  integer NOT NULL,
  region     text    NOT NULL DEFAULT '',
  brand      text    NOT NULL,
  model      text    NOT NULL,
  n          integer NOT NULL,
  PRIMARY KEY (powertrain, make_year, region, brand, model)
);
