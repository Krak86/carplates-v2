-- YouTube videos embedded in a brand's own site articles (scripts/src/honda-videos.ts: honda.ua "press review" pages), one
-- row per (video, model): the importer's articles name the model (and often the year) in the title, so the result card's
-- "Videos" section can show them next to infocar's. Links + facts only — the video is YouTube's, embedded from there.
-- `model_slug` follows the infocar catalog slugs (brand-only articles are not stored: a lookup needs a model).

CREATE TABLE registry.site_videos (
  youtube_id text NOT NULL,
  model_slug text NOT NULL,
  brand_slug text NOT NULL,
  year integer,
  title text NOT NULL,
  article_url text NOT NULL,
  published_at date,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (youtube_id, model_slug)
);

CREATE INDEX ix_site_videos_brand_model ON registry.site_videos (brand_slug, model_slug);
