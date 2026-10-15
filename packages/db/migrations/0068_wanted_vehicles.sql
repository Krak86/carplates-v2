-- Vehicles wanted for unlawful taking ("в угоні/розшуку"). Source: National Police open dataset "Інформація про транспортні
-- засоби, що перебувають у розшуку…" on data.gov.ua (CC BY, refreshed several times a day, plate + body/chassis numbers).
-- The feed lists only CURRENTLY wanted vehicles, so `pnpm ingest:wanted` keeps every record it has ever seen: a record that
-- disappears from the feed gets `resolved_at` (found, or the search was cancelled — the feed does not say which). That is the
-- "history" shown on the card. Live data: not part of the seed CSVs.

CREATE TABLE registry.wanted_vehicles (
  source_id      text PRIMARY KEY,
  plate          text,
  vin            text,
  brand          text,
  model          text,
  vehicle_type   text,
  color          text,
  seized_at      date,
  registered_at  date,
  organ_unit     text,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE INDEX ix_wanted_vehicles_plate ON registry.wanted_vehicles (plate) WHERE plate IS NOT NULL;
CREATE INDEX ix_wanted_vehicles_vin ON registry.wanted_vehicles (vin) WHERE vin IS NOT NULL;
CREATE INDEX ix_wanted_vehicles_last_seen ON registry.wanted_vehicles (last_seen_at);
