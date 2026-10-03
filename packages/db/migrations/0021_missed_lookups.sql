-- Searches that found nothing in the registry (plate or VIN) — only values that pass the format rules
-- (isUaPlate / isVin), so typos and junk never land here. One row per (kind, value); `hits` counts repeats.
-- Written by the API (apps/api/src/missed/), never by ingest.

CREATE TABLE registry.missed_lookups (
  kind text NOT NULL CHECK (kind IN ('plate', 'vin')),
  value text NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, value)
);

CREATE INDEX ix_missed_lookups_last_seen ON registry.missed_lookups (last_seen DESC);
