-- Fuel/CO2 statistics rollup for the /fuel page: one row per distinct (brand, model, make_year, fuel, engine
-- capacity rounded to 100 cc) of registered passenger cars, with the registration count `n` and the CO2 estimate
-- the reference data gives that group (null = no similar vehicle). Rebuilt in full by `pnpm db:refresh-fuel-stats`
-- (scripts/src/fuel-stats.ts), which runs the SAME matcher the result card uses (packages/shared/src/fuelMatch.ts) —
-- so it has to be re-run after any registry or fuel_economy change. A plain table, not a matview, because the
-- matching is TypeScript, not SQL.

CREATE TABLE registry.stats_fuel (
  brand text NOT NULL,
  model text NOT NULL,
  make_year integer NOT NULL,
  -- Raw registry fuel text, kept for drill-down; fuel_class is the normalized bucket the page groups by.
  fuel text,
  fuel_class text NOT NULL,
  capacity_bucket integer,
  n integer NOT NULL,
  -- Midpoint of the matched min–max range; source/cycle say where it came from. All null when unmatched.
  co2_g_km real,
  l_100km real,
  source text,
  cycle text
);

CREATE INDEX ix_stats_fuel_year ON registry.stats_fuel (make_year);
CREATE INDEX ix_stats_fuel_brand ON registry.stats_fuel (brand);
