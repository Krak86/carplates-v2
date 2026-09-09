-- Initial registry schema: full-history registrations + latest-per-plate view.

CREATE SCHEMA IF NOT EXISTS registry;

CREATE TABLE registry.registrations (
  id                bigserial PRIMARY KEY,
  plate             text NOT NULL,
  person            text,
  reg_addr_koatuu   text,
  oper_code         integer,
  oper_name         text,
  d_reg             date,
  dep_code          text,
  dep               text,
  brand             text,
  model             text,
  vin               text,
  make_year         integer,
  color             text,
  kind              text,
  body              text,
  purpose           text,
  fuel              text,
  capacity          integer,
  own_weight        integer,
  total_weight      integer,
  source_resource_id text
);

CREATE INDEX ix_reg_plate ON registry.registrations (plate, d_reg DESC);
CREATE INDEX ix_reg_vin ON registry.registrations (vin) WHERE vin IS NOT NULL;

-- Re-ingest idempotency. NULLS NOT DISTINCT (PG15+) so rows with a null vin /
-- d_reg / oper_code still collide instead of duplicating on every import.
CREATE UNIQUE INDEX ux_reg_dedupe
  ON registry.registrations (plate, d_reg, oper_code, vin) NULLS NOT DISTINCT;

CREATE TABLE registry.ingested_resources (
  ckan_resource_id text PRIMARY KEY,
  name             text,
  url              text,
  last_modified    timestamptz,
  ingested_at      timestamptz NOT NULL DEFAULT now(),
  row_count        integer
);

CREATE MATERIALIZED VIEW registry.current_registration AS
SELECT DISTINCT ON (plate)
  plate, person, reg_addr_koatuu, oper_code, oper_name, d_reg, dep_code, dep,
  brand, model, vin, make_year, color, kind, body, purpose, fuel, capacity,
  own_weight, total_weight
FROM registry.registrations
ORDER BY plate, d_reg DESC NULLS LAST, id DESC
WITH NO DATA;

-- Unique index → enables REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX ux_current_registration_plate
  ON registry.current_registration (plate);
