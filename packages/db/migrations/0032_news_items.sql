-- Auto-news (scripts/src/news.ts, feeds listed in scripts/news-sources.json): one row per article from the RSS feeds,
-- accumulated by url because each feed only holds its latest N items. Facts + links only (title, ≤300-char summary,
-- hotlinked image url, date) — article text is never stored or republished.
--
-- `brand_slug` / `model_slug` are the infocar catalog's slugs found in the title at ingest (NULL = general news, shown
-- only on the homepage); `year` is a model year named in the title. Pruned by the ingest (published > 180 days ago).

CREATE TABLE registry.news_items (
  url text PRIMARY KEY,
  source text NOT NULL,
  title text NOT NULL,
  summary text,
  image_url text,
  published_at timestamptz NOT NULL,
  lang text NOT NULL,
  brand_slug text,
  model_slug text,
  year integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_news_items_brand ON registry.news_items (brand_slug, published_at DESC);
CREATE INDEX ix_news_items_published ON registry.news_items (published_at DESC);
