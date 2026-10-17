-- Wanted vehicles: history backfill from stolen.in.ua + a region per record (WANTED_PLAN.md). Backward compatible (blue/green):
-- only new columns with defaults and new tables.
--   source         'feed' (National Police CarsWanted.json) | 'stolen.in.ua' (scraped history, found cars only)
--   resolved_exact false for a month-card placeholder whose real "removed from wanted" date is unknown
--   region         derived from organ_unit (REGION_NAMES in @carplates/shared)

ALTER TABLE registry.wanted_vehicles
  ADD COLUMN source text NOT NULL DEFAULT 'feed',
  ADD COLUMN resolved_exact boolean NOT NULL DEFAULT true,
  ADD COLUMN region text;

CREATE INDEX ix_wanted_vehicles_seized_at ON registry.wanted_vehicles (seized_at);
CREATE INDEX ix_wanted_vehicles_resolved_at ON registry.wanted_vehicles (resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX ix_wanted_vehicles_region ON registry.wanted_vehicles (region) WHERE region IS NOT NULL;

-- Scrape resume state: one row per fetched stolen.in.ua month page / detail page.
CREATE TABLE registry.wanted_scrape_pages (
  month      text PRIMARY KEY,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  cards      integer NOT NULL
);

CREATE TABLE registry.wanted_scrape_ids (
  ident      text PRIMARY KEY,
  status     text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
