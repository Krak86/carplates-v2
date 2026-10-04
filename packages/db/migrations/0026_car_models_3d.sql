-- Sketchfab 3D car models (scripts/src/sketchfab.ts): one row per community-uploaded, embeddable model of a make/model
-- found through Sketchfab's public Data API search, so a result card can offer a "3D view" modal. Facts + links only —
-- the model itself is never stored or re-hosted; the viewer is Sketchfab's own embed iframe, and the author/licence
-- credit is shown with it. `thumb_url` is hot-linked from Sketchfab's CDN.
--
-- `brand_slug` is our brand slug (infocar spelling), `model_slug` the infocar model slug the search was run for
-- (`Cee'd` -> `ceed`); `year` is parsed from the model's title when it carries one (NULL otherwise — the UI shows a
-- make/model's models regardless of year). Rebuilt by re-running the ingest.

CREATE TABLE registry.car_models_3d (
  uid text PRIMARY KEY,
  name text NOT NULL,
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  model_name text NOT NULL,
  year integer,
  author_name text NOT NULL,
  author_url text NOT NULL,
  thumb_url text,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  license text,
  published_at date,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_car_models_3d_brand_model ON registry.car_models_3d (brand_slug, model_slug);
