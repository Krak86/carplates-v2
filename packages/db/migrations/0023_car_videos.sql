-- infocar.ua video catalog (scripts/src/infocar-videos.ts): each video on infocar's `/video/<brand>/` listings, joined
-- by its YouTube id, so a registry (brand, model, year) can show "video reviews" next to the text reviews
-- (infocar_versions). Facts + links only — title, thumbnail URL, duration, date; no description text. The video is
-- embedded from YouTube on click, never copied.
--
-- `model_slug` comes from the canonical URL of the video page (`kia-stonic.infocar.ua/...`) when it has one;
-- `year` is parsed from the title when it names one. Both NULL = a brand-level video. Rebuilt by re-running the
-- ingest; shipped as a gz CSV for zero-crawl setup like the ratings tables.

CREATE TABLE registry.car_videos (
  id bigserial PRIMARY KEY,
  youtube_id text NOT NULL UNIQUE,
  infocar_video_id integer NOT NULL UNIQUE,
  url text NOT NULL,
  title text NOT NULL,
  thumb_url text,
  duration_s integer,
  published_at date,
  brand_slug text NOT NULL,
  model_slug text,
  year integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_car_videos_brand_model ON registry.car_videos (brand_slug, model_slug);
