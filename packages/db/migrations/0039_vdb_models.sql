-- VehiclesDB make/model catalog (https://vehiclesdb.com, CC-BY 4.0 — "Vehicle data by VehiclesDB" must be shown on
-- the About sources page). Loaded from its dist/vehicles.csv by scripts/src/vehiclesdb.ts; a committed gz CSV
-- round-trips the table, no live calls. Facts only: which markets a model is sold in and its cross-market
-- popularity decile (1 = most popular, mean of per-country deciles, equal country weight; null = not ranked).
-- Separate, removable block: drop this table to remove the source.

CREATE TABLE registry.vdb_models (
  -- "{kind}:{make_slug}:{model_slug}" — VehiclesDB's own slugs, stable across releases.
  id text PRIMARY KEY,
  kind text NOT NULL,
  make_slug text NOT NULL,
  make_name text NOT NULL,
  model_slug text NOT NULL,
  model_name text NOT NULL,
  -- Matching keys — packages/shared/src/vehicleKey.ts, same functions the other reference tables use.
  make_key text NOT NULL,
  model_key text NOT NULL,
  body_types text[] NOT NULL DEFAULT '{}',
  -- ISO 3166 alpha-2 (lowercase) of the registers the model appears in, and their regions (eu, na, as, oc, sa ...).
  countries text[] NOT NULL DEFAULT '{}',
  regions text[] NOT NULL DEFAULT '{}',
  global_decile smallint,
  aliases text[] NOT NULL DEFAULT '{}',
  former_ids text[] NOT NULL DEFAULT '{}',
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_vdb_models_make_model ON registry.vdb_models (make_key, model_key);
