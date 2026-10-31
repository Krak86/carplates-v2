-- Garpun: National Police list of wanted LICENCE PLATES (data.gov.ua `licplatewanted`, CC BY, updated daily). A different fact from
-- registry.wanted_vehicles (a vehicle is wanted): here only the plate is wanted, there is no VIN / brand. Same history model as
-- wanted_vehicles: the feed lists only current rows, so `pnpm ingest:wanted-plates` keeps every row it has seen and sets
-- `resolved_at` when one leaves the feed. Live data, not part of the seed CSVs. New table only: backward compatible (blue/green).

CREATE TABLE registry.wanted_plates (
  source_id      text PRIMARY KEY,
  plate          text NOT NULL,
  seized_at      date,
  inserted_at    date,
  organ_unit     text,
  region         text,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE INDEX ix_wanted_plates_plate ON registry.wanted_plates (plate);
CREATE INDEX ix_wanted_plates_seized_at ON registry.wanted_plates (seized_at);
CREATE INDEX ix_wanted_plates_region ON registry.wanted_plates (region) WHERE region IS NOT NULL;
CREATE INDEX ix_wanted_plates_last_seen ON registry.wanted_plates (last_seen_at);
