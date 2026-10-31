-- SETAM auctions of seized / confiscated property (data.gov.ua dataset `eda4e3cf-…`, CC BY, Cabinet Resolution 835, updated daily).
-- Only the vehicle categories are kept (`Легкові автомобілі`, `Вантажні автомобілі`); the winner column is never stored.
-- One row per lot: a re-listed car gets a NEW lot number, and the same lot repeats across the monthly files as it moves through
-- statuses, so `pnpm ingest:auctions` upserts on `lot_no` (the newest snapshot wins). `plate` / `vin` / `make` / `model` / `year`
-- are parsed out of the free-text title (`title_raw`, kept verbatim) and are null when the title does not carry them.
-- Re-ingestable from the feed, so not part of the seed CSVs or `backup.sh`. New table only: backward compatible (blue/green).

CREATE TABLE registry.auction_lots (
  lot_no         integer PRIMARY KEY,
  proceeding_no  text,
  status         text NOT NULL,
  category       text NOT NULL,
  region         text,
  start_price    numeric(14, 2),
  sale_price     numeric(14, 2),
  title_raw      text NOT NULL,
  plate          text,
  vin            text,
  make           text,
  model          text,
  year           smallint,
  source_file    text NOT NULL,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_auction_lots_plate ON registry.auction_lots (plate) WHERE plate IS NOT NULL;
CREATE INDEX ix_auction_lots_vin ON registry.auction_lots (vin) WHERE vin IS NOT NULL;
CREATE INDEX ix_auction_lots_make_model ON registry.auction_lots (make, model);
CREATE INDEX ix_auction_lots_status ON registry.auction_lots (status);
