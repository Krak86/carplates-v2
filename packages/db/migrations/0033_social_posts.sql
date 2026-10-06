-- Brand / group YouTube channel uploads (scripts/src/social.ts; channels listed in packages/shared/src/socialChannels.ts),
-- polled from each channel's public RSS feed (no API key, no quota) and accumulated by url because a feed only holds the
-- latest ~15 videos. Facts + links only (title, ≤300-char description, hotlinked thumbnail, date) — nothing is re-hosted.
--
-- `channel` is the key in `SOCIAL_CHANNELS`: an infocar brand slug for a make, `group:<id>` for a parent group. Pruned by
-- the ingest (published > 365 days ago).

CREATE TABLE registry.social_posts (
  url text PRIMARY KEY,
  platform text NOT NULL DEFAULT 'youtube',
  channel text NOT NULL,
  title text NOT NULL,
  summary text,
  image_url text,
  published_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_social_posts_channel ON registry.social_posts (channel, published_at DESC);
