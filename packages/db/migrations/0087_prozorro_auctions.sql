-- Prozorro.Sale vehicle auctions (https://procedure.prozorro.sale/api/search/byDateModified, free reuse with source credit).
-- Only auctions that carry a plate or a VIN are kept (the rest cannot be looked up). Separate from `registry.auction_lots` (SETAM):
-- different platform and IDs; the API merges both per plate / VIN. One row per auction (first vehicle if there are several),
-- upserted on `auction_id` (full ID with the `BRE001-` style prefix) when `source_modified_at` is newer.
-- Raw seller / tag fields are stored next to the derived `seller_kind` so the derivation can be fixed without a re-crawl.
-- Photos: URLs only (`photo_urls`), never files. Re-ingestable from the feed, so not part of the seed CSVs or `backup.sh`.
-- New table only: backward compatible (blue/green).

CREATE TABLE registry.prozorro_auctions (
  auction_id          text PRIMARY KEY,
  selling_method      text,
  status              text NOT NULL,
  value               numeric(14, 2),
  minimal_step        numeric(14, 2),
  guarantee           numeric(14, 2),
  final_price         numeric(14, 2),
  auction_start       timestamptz,
  tender_start        timestamptz,
  tender_end          timestamptz,
  plate               text,
  vin                 text,
  make                text,
  model               text,
  year                smallint,
  color               text,
  kilometrage         integer,
  fuel                text,
  engine_cc           integer,
  transmission        text,
  condition           text,
  damaged             boolean,
  damage_text         text,
  region              text,
  locality            text,
  lat                 double precision,
  lon                 double precision,
  title_raw           text NOT NULL,
  description_raw     text,
  seller_name         text,
  seller_edrpou       text,
  seller_kind         text,
  categories          jsonb NOT NULL DEFAULT '[]'::jsonb,
  directions          jsonb NOT NULL DEFAULT '[]'::jsonb,
  auction_type        text,
  photo_urls          jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_modified_at  timestamptz NOT NULL,
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_prozorro_auctions_plate ON registry.prozorro_auctions (plate) WHERE plate IS NOT NULL;
CREATE INDEX ix_prozorro_auctions_vin ON registry.prozorro_auctions (vin) WHERE vin IS NOT NULL;
CREATE INDEX ix_prozorro_auctions_status ON registry.prozorro_auctions (status);
CREATE INDEX ix_prozorro_auctions_auction_start ON registry.prozorro_auctions (auction_start);
CREATE INDEX ix_prozorro_auctions_seller_kind ON registry.prozorro_auctions (seller_kind);
CREATE INDEX ix_prozorro_auctions_modified ON registry.prozorro_auctions (source_modified_at);
