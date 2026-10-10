-- Transport Canada recalls (stage H, cut down): only the campaigns that have NO US (NHTSA) twin, so the Canadian list adds
-- something to the US one instead of repeating it. Source: Vehicle Recalls Database CSV (Open Government Licence - Canada),
-- safety notifications since 2010 only (compliance / labelling notices are not recalls). The twin test runs while ingesting
-- (`pnpm ingest:ca-recalls`, scripts/src/ca-recalls-parse.ts); both tables are replaced as a whole.

CREATE TABLE registry.ca_recalls (
  recall_number text PRIMARY KEY,
  recalled_at   date,
  notification  text,
  category      text,
  system        text,
  mfr_recall_no text,
  comment       text,
  units         integer,
  scraped_at    timestamptz NOT NULL DEFAULT now()
);

-- The make/model/model-year rows each campaign covers, with the TC spelling and our keys. model_year 0 = not recorded.
CREATE TABLE registry.ca_recall_models (
  recall_number text     NOT NULL,
  make          text     NOT NULL,
  model         text     NOT NULL,
  make_key      text     NOT NULL,
  model_key     text     NOT NULL,
  model_year    smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (recall_number, make_key, model_key, model_year)
);

CREATE INDEX ix_ca_recall_models_make ON registry.ca_recall_models (make_key, model_key);
