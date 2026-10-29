-- stats_region_facet: per plate region, the biggest passenger-car models (top 5), every fuel class and the biggest brand home
-- countries (top 5), for the map modes of /stats (top model / fuel / origin / EV share). `facet` is 'model' | 'fuel' | 'origin'
-- | 'fleet'; `value` is the folded model name, the fuel class (registryFuelClass), the brand country code at the model year,
-- and '' for the 'fleet' row (the region's whole passenger fleet, for shares). `n` = current registrations. Rebuilt by
-- scripts/src/region-facet-stats.ts (db:refresh-region-facet-stats, part of db:refresh-derived).
CREATE TABLE registry.stats_region_facet (
  facet  text    NOT NULL,
  region text    NOT NULL,
  value  text    NOT NULL,
  n      integer NOT NULL,
  PRIMARY KEY (facet, region, value)
);
