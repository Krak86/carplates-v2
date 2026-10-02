-- Fuel consumption + tailpipe CO2 reference data (see PLAN.md "Fuel economy & emissions"). Loaded from
-- bulk files (fueleconomy.gov vehicles.csv first; EEA/NRCan later) by scripts/src/fuel-economy.ts —
-- same shape as the *_ratings tables: a committed gz CSV round-trips the table, no live API calls.
--
-- Values are normalized on load (EPA g/mi → g/km, MPG → L/100km). `cycle` records the test procedure
-- (EPA reads lower than WLTP) and must be shown next to any number — never mix cycles unlabeled.

CREATE TABLE registry.fuel_economy (
  -- "{source}:{source id}" — fueleconomy.gov's own vehicle id, stable across releases.
  id text PRIMARY KEY,
  source text NOT NULL,
  cycle text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  -- Matching keys — packages/shared/src/vehicleKey.ts, same functions the NCAP tables use.
  make_key text NOT NULL,
  model_key text NOT NULL,
  model_year integer NOT NULL,
  -- Raw source fuel label ("Regular Gasoline", "Electricity", ...) plus our normalized category.
  fuel_type text NOT NULL,
  fuel_category text NOT NULL,
  engine_cc integer,
  cylinders integer,
  -- Combined cycle. Null l_100km for EVs; co2_g_km 0 for pure EVs (tailpipe only).
  l_100km real,
  co2_g_km real,
  ev_kwh_100km real,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_fuel_economy_make_model ON registry.fuel_economy (make_key, model_key, model_year);
