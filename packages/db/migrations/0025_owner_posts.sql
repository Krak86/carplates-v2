-- e-drive.com.ua owner posts (scripts/src/edrive.ts): the car-owner social network's logbook posts (repairs, service,
-- accessories ...), joined to a make/model/generation by its own catalog, so a registry (brand, model, year) can link
-- "owner stories" next to the infocar reviews. Facts + links only — title, category, cover URL, date; no post text.
--
-- `brand_slug` is our brand slug (infocar spelling), `model_slug` the e-drive model name slugified the same way as
-- infocar's (`Cee'd` -> `ceed`). `year_from`/`year_to` is the generation's year range (the next generation's start - 1;
-- NULL `year_to` = still in production). Rebuilt by re-running the ingest.

CREATE TABLE registry.owner_posts (
  post_id integer PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL,
  category text,
  cover_url text,
  created_at date,
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  model_name text NOT NULL,
  generation_name text,
  year_from integer,
  year_to integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_owner_posts_brand_model ON registry.owner_posts (brand_slug, model_slug);
