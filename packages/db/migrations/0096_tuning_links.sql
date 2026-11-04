-- 3DTuning "Customize in 3D" link index (docs/tuning-3d-plan.md). One row per car page listed in https://www.3dtuning.com/sitemap.xml
-- (`/en-US/tuning/<make>/<model>/<body>[-<generation>].<startYear>`). We only link out: no 3DTuning content is copied or embedded.
-- `path` is the page path without the locale (`tuning/bmw/3.series/sedan-e90.2005`), so the locale is chosen at link time.
-- New table only: backward-compatible with the previous api colour. Loaded by scripts/src/ingest-3dtuning.ts (seed CSV 3dtuning-links.csv.gz).
CREATE TABLE registry.tuning_links (
  make_slug text NOT NULL,
  model_slug text NOT NULL,
  body text NOT NULL DEFAULT '',
  generation text NOT NULL DEFAULT '',
  start_year smallint NOT NULL,
  path text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_tuning_links_make_model ON registry.tuning_links (make_slug, model_slug);
