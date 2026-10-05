-- YouTube fallback for models infocar.ua has no video for (scripts/src/youtube-videos.ts, PLAN.md "Step 2a").
-- A sibling of registry.car_videos, not an extension: that one is infocar-specific (infocar_video_id NOT NULL, an
-- infocar page url). Links + facts only — thumbnails are derived from the id (i.ytimg.com), nothing is mirrored.
--
-- `brand_slug` is the infocar brand slug (`infocarBrandSlug`); `model_slug` is the slug of the registry model with its
-- doubled spelling collapsed ("LANOS LANOS" -> `lanos`) — the same key `youtube_model_runs` uses as its resume marker.
-- `lang` comes from the title's script (ua | ru | en; ambiguous Cyrillic counts as ru). `year` is a model year named in
-- the title, null when it names none.

CREATE TABLE registry.youtube_videos (
  id bigserial PRIMARY KEY,
  youtube_id text NOT NULL UNIQUE,
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('ua', 'ru', 'en')),
  title text NOT NULL,
  channel text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  duration_s integer NOT NULL,
  published_at date,
  year smallint,
  query text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_youtube_videos_brand_model ON registry.youtube_videos (brand_slug, model_slug);

-- One row per (brand, model) the search has been run for: the resume marker, and the per-day quota ledger
-- (`units` summed over the current Pacific day; the API quota resets at midnight Pacific). `status`: ok (>= 1 video
-- kept) | none (searched, nothing survived the filter — retried after ~30 days).
CREATE TABLE registry.youtube_model_runs (
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'none')),
  kept integer NOT NULL DEFAULT 0,
  queries integer NOT NULL DEFAULT 0,
  units integer NOT NULL DEFAULT 0,
  cars integer NOT NULL DEFAULT 0,
  run_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_slug, model_slug)
);
