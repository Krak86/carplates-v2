-- stats_region_brand: the biggest passenger-car brands of every plate region (top 5 per region, brands folded by logo slug),
-- for the brand-logo layer of the /stats map. `brand` is the most common spelling inside the folded group; rows with an
-- empty brand hold the region's whole passenger fleet (for shares). `n` = current registrations. Rebuilt by
-- scripts/src/region-brand-stats.ts (db:refresh-region-brand-stats, part of db:refresh-derived).
CREATE TABLE registry.stats_region_brand (
  region text    NOT NULL,
  brand  text    NOT NULL,
  n      integer NOT NULL,
  PRIMARY KEY (region, brand)
);
