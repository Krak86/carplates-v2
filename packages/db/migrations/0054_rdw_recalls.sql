-- RDW recall campaigns (stage D): one row per campaign (open data j9yg-7rg9 + hazard texts 9ihi-jgpf) and a link table of the
-- make/type pairs each campaign covers (mu2x-mu5e). Model-level only — RDW's per-plate status is Dutch plates, never ours.
-- Re-ingestable (`pnpm ingest:rdw-recalls`), upserted by reference code since the data changes (new campaigns, edited text).

CREATE TABLE registry.rdw_recalls (
  reference_code    text PRIMARY KEY,
  published_at      date,
  announced_at      date,
  producer          text,
  defect            text,
  category          text,
  consequences      text,
  remedy            text,
  more_info_url     text,
  risk_code         text,
  hazards           jsonb,
  vehicles_total    integer,
  vehicles_national integer,
  scraped_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE registry.rdw_recall_models (
  reference_code text NOT NULL,
  make           text NOT NULL,
  model          text NOT NULL,
  make_key       text NOT NULL,
  model_key      text NOT NULL,
  PRIMARY KEY (reference_code, make_key, model_key)
);

CREATE INDEX ix_rdw_recall_models_make ON registry.rdw_recall_models (make_key, model_key);
