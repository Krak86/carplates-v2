-- Winner Imports (stock.winner.ua) interior 360° panoramas (scripts/src/winner360.ts): one row per stock card that has a
-- "Фото 360" photo, taken from the dealer's own public JSON endpoint, so a result card's 360° modal can offer an
-- "Alt. interior" tab. Facts + links only — the viewer is Winner's own page (`/360.php?photo_recid=…`), nothing is
-- re-hosted. Live inventory: a re-run replaces the set (rows that left the stock are deleted).
--
-- `brand_slug`/`model_slug` follow our infocar-style slugs (brand via infocarBrandSlug, model = slugified Winner model
-- name without its trailing "New"), so the lookup matches them like car_models_360.

CREATE TABLE registry.winner_360 (
  photo_recid bigint PRIMARY KEY,
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  version text,
  fuel text,
  photo_url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_winner_360_brand_model ON registry.winner_360 (brand_slug, model_slug);
