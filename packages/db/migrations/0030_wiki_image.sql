-- Wikimedia hero-photo cache (apps/api WikiService + scripts/src/wiki-images.ts): one row per normalized
-- (brand, model, year), so the plate/VIN result reads its car photo from our own DB instead of calling Wikimedia.
-- Image *metadata* only (url, size, attribution) — files stay hotlinked from upload.wikimedia.org. Language-free: one
-- row serves ua/ru/en. See PLAN.md "Wikimedia hero-image cache in Postgres + pre-warm".
--
-- `brand`/`model` are lower-cased + whitespace-collapsed (`wikiImageKey` in @carplates/shared). `year` 0 = the
-- model-level row (the newest-year photo, or the English article's lead image) that a lookup falls back to.
-- `status`: ok | not_found (Wikimedia answered 200 with no qualifying image — retried after ~30 days) | failed
-- (429/5xx/timeout retries exhausted or a non-retryable 4xx — never shown as "no photo"; retried at `next_retry_at`).
-- `attempts` counts consecutive failures. `origin`: commons_year | commons_nearest | commons_model | lead.
-- Rebuilt/extended by re-running the pre-warm; ok + not_found rows ship as a committed CSV seed.

CREATE TABLE registry.wiki_image (
  brand text NOT NULL,
  model text NOT NULL,
  year smallint NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('ok', 'not_found', 'failed')),
  image_url text,
  image_width integer,
  image_height integer,
  attr_author text,
  attr_license text,
  attr_license_url text,
  origin text CHECK (origin IN ('commons_year', 'commons_nearest', 'commons_model', 'lead')),
  title text,
  last_http_status integer,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand, model, year)
);

CREATE INDEX ix_wiki_image_status ON registry.wiki_image (status, next_retry_at);
