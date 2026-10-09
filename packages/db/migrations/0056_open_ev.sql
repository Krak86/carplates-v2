-- Open EV Data (stage E): one row per EV / plug-in hybrid variant from OpenChargingCloud/open-ev-data (MIT): usable battery,
-- consumption, AC and DC charging. Matched to the registry on make_key/model_key. Re-ingestable (`pnpm ingest:open-ev`), upserted by id.

CREATE TABLE registry.open_ev (
  id                 text PRIMARY KEY,
  make               text NOT NULL,
  model              text NOT NULL,
  variant            text NOT NULL DEFAULT '',
  make_key           text NOT NULL,
  model_key          text NOT NULL,
  powertrain         text NOT NULL,
  release_year       smallint,
  battery_kwh        real,
  consumption_kwh100 real,
  ac_max_kw          real,
  ac_phases          smallint,
  ac_ports           jsonb,
  dc_max_kw          real,
  dc_ports           jsonb,
  scraped_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_open_ev_model ON registry.open_ev (make_key, model_key);
