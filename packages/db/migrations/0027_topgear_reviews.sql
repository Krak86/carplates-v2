-- TopGear UK editorial reviews (scripts/src/topgear.ts): one row per `topgear.com/car-reviews/<make>/<model>` page, so a
-- result card can link to the English-language verdict + score. Facts + links only (title, score, date, the page's meta
-- description as blurb, url) — review text is never stored or republished. See PLAN.md "Step 2c".
--
-- `make_slug`/`model_slug` are TopGear's own URL segments; `brand_slug` is our (infocar-spelled) brand slug, NULL when
-- TopGear's make has no match in the catalog. `year_from`/`year_to` come from a slug range (`sportage-2017-2021`), else
-- NULL — TopGear has no per-year pages, `published_at` is the fallback generation anchor. `rating` is out of
-- `best_rating` (10); NULL when the page carries no score. Rebuilt by re-running the ingest.

CREATE TABLE registry.topgear_reviews (
  url text PRIMARY KEY,
  make_slug text NOT NULL,
  model_slug text NOT NULL,
  brand_slug text,
  title text NOT NULL,
  rating real,
  best_rating real,
  published_at date,
  year_from integer,
  year_to integer,
  blurb text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_topgear_reviews_brand_model ON registry.topgear_reviews (brand_slug, model_slug);
