-- Euro NCAP crash-test ratings, scraped from euroncap.com (no public API — see
-- scripts/src/euroncap.ts) and persisted here rather than fetched live like NHTSA,
-- since there's nothing to call per-request. One row per tested assessment
-- (make/model/generation/variant), refreshed by re-running the scraper.

CREATE TABLE registry.euroncap_ratings (
  assessment_id text PRIMARY KEY,
  url text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  -- Matching keys — see packages/shared/src/vehicleKey.ts. The scraper and the
  -- API's lookup both derive these the same way, so they must always agree.
  make_key text NOT NULL,
  model_key text NOT NULL,
  tested_variant text,
  body_type text,
  rating_year integer,
  stars smallint,
  adult_occupant_pct smallint,
  child_occupant_pct smallint,
  vulnerable_road_users_pct smallint,
  safety_assist_pct smallint,
  safety_pack boolean NOT NULL DEFAULT false,
  -- Media stays as source URLs/ids only — hotlinked (images) or embedded via
  -- YouTube's own player (videos), never downloaded or rehosted.
  front_image_url text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  youtube_ids text[] NOT NULL DEFAULT '{}',
  report_pdf_url text,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_euroncap_make_model ON registry.euroncap_ratings (make_key, model_key);
