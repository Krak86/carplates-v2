-- Official manufacturer links (configurator, model page) per make/model, shown in the virtual showroom (`/showroom`, kind "oem").
-- Link-out only: no manufacturer content is copied or embedded. Loaded by scripts/src/ingest-oem-links.ts (seed CSV oem-links.csv.gz).
-- New table only: backward-compatible with the previous api colour.
CREATE TABLE registry.oem_links (
  make_slug text NOT NULL,
  model_slug text NOT NULL,
  -- Trim / edition shown next to the model ("SE Performante"); empty when the link is for the whole model.
  variant text NOT NULL DEFAULT '',
  url text NOT NULL,
  -- 'configurator' | 'model-page'
  kind text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One URL may serve several models (Lucid has one configurator for all).
  PRIMARY KEY (make_slug, model_slug, variant, url)
);
