-- By-brand rollup, same footing as stats_by_body/kind/color (0002_stats_rollups.sql)
-- — free-text vehicle manufacturer ("LEXUS", "PEUGEOT", "HONDA", ...), no normalization.
CREATE MATERIALIZED VIEW registry.stats_by_brand AS
SELECT
  brand,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY brand
WITH NO DATA;

-- Brand x year 2D rollup, mirrors stats_by_region_year (0002_stats_rollups.sql)
-- — backs the "by brand and year" stats table (sortable/filterable year column).
CREATE MATERIALIZED VIEW registry.stats_by_brand_year AS
SELECT
  brand,
  extract(year FROM d_reg)::int AS year,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY brand, extract(year FROM d_reg)::int
WITH NO DATA;
