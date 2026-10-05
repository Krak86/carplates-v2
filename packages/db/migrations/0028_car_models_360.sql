-- CarShow360 360° exterior/interior galleries (scripts/src/carshow360.ts): one row per gallery of a make/model, taken
-- from carshow360.net's public sitemap, so a result card can offer a "360° view" modal. Facts + links only — the viewer
-- is carshow360.net's own embed iframe (`/{lang}/{brand}/{model}/{slug}-{id}?iframe`), nothing is re-hosted.
--
-- `brand_slug`/`model_slug` are carshow360's own URL slugs (they match our infocar-style brand slugs; the model slug is
-- matched with the same candidates as infocar). `label` is the generation/trim text derived from the URL slug
-- ("III FL2021 Hatchback Buissnes Line"); `title` is the page <title> when the optional --enrich pass has fetched it.
-- Rebuilt by re-running the ingest.

CREATE TABLE registry.car_models_360 (
  id integer PRIMARY KEY,
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  slug text NOT NULL,
  label text NOT NULL,
  title text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_car_models_360_brand_model ON registry.car_models_360 (brand_slug, model_slug);
