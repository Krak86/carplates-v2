-- infocar.ua catalog (scripts/src/infocar.ts): its brand -> model -> version tree, once per tree, so a registry
-- (brand, model, year) links to the exact generation page (KIA Ceed 2019 -> "Ceed 2018-2021") instead of a guessed URL.
-- Facts + links only — no article/review text or authors (copyright, personal data).
--
-- `tree`: 'test_drive' (/test-drive/...) or 'reviews' (/reviews/..., owner reviews). One row per version card; a model
-- with no version cards, or a model-level fact, is a row with version_name NULL whose url is the model page. The
-- model-level `review_count`/`avg_rating` (reviews tree only) are repeated on that model's rows. `year_to` NULL with a
-- non-null `year_from` = still in production. `is_ru` tags the Russian/Soviet brand section (ВАЗ, ГАЗ, ЗАЗ ...).
-- Rebuilt by re-running the ingest; shipped as a gz CSV for zero-crawl setup like the ratings tables.

CREATE TABLE registry.infocar_versions (
  id bigserial PRIMARY KEY,
  tree text NOT NULL CHECK (tree IN ('test_drive', 'reviews')),
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  model_name text NOT NULL,
  version_name text,
  year_from integer,
  year_to integer,
  url text NOT NULL UNIQUE,
  review_count integer,
  avg_rating real,
  is_ru boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_infocar_brand_model_year ON registry.infocar_versions (brand_slug, model_slug, year_from);
