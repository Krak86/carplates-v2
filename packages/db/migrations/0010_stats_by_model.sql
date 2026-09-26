-- By brand+model rollup, backing the stats-page "top 5 models" leaderboard
-- only (see StatsRoute's TopStatsPanel) -- not a full browsable dimension like
-- stats_by_brand: (brand, model) has ~79k distinct pairs, most of them ingest
-- noise (dirty free-text variants of the same real car), so nothing queries
-- this beyond "top N by distinct_plates". Rows with either half NULL are
-- excluded -- a bare model with no brand isn't a meaningful leaderboard entry.
CREATE MATERIALIZED VIEW registry.stats_by_model AS
SELECT
  brand,
  model,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
WHERE brand IS NOT NULL AND model IS NOT NULL
GROUP BY brand, model
WITH NO DATA;
