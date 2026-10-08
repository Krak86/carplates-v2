-- RDW (Dutch vehicle authority) open-data specs, aggregated per make/model/year — never the ~17M raw rows.
-- Source: opendata.rdw.nl, "Gekentekende voertuigen" (m9d7-ebf2) joined server-side to its fuel/emissions dataset
-- (8ys7-d773) on kenteken; licence CC0 1.0 (credit on the About sources page anyway). Loaded by scripts/src/rdw.ts;
-- a committed gz CSV round-trips the table, no live calls. EU-spec figures: power, displacement, unladen mass and
-- combined CO2 as min / median / max over the Dutch vehicles of that make/model/year.
-- Separate, removable block: drop this table to remove the source.

CREATE TABLE registry.rdw_specs (
  -- Vehicle class — car / motorcycle / truck / bus — the same classes as registry.vdb_models.kind.
  kind text NOT NULL,
  -- RDW's own spellings ("VOLKSWAGEN", "GOLF VARIANT"), kept for display.
  make text NOT NULL,
  model text NOT NULL,
  -- Matching keys — packages/shared/src/vehicleKey.ts, same functions the other reference tables use.
  make_key text NOT NULL,
  model_key text NOT NULL,
  -- Year of first registration in the Netherlands.
  model_year smallint NOT NULL,
  n integer NOT NULL,
  power_kw_min real,
  power_kw_median real,
  power_kw_max real,
  displacement_cc_min real,
  displacement_cc_median real,
  displacement_cc_max real,
  mass_kg_min real,
  mass_kg_median real,
  mass_kg_max real,
  co2_g_km_min real,
  co2_g_km_median real,
  co2_g_km_max real,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, make_key, model_key, model_year)
);

CREATE INDEX ix_rdw_specs_make_model ON registry.rdw_specs (make_key, model_key);
