-- By-fuel rollup, same footing as stats_by_body/kind/color (see
-- 0002_stats_rollups.sql) — backs the fuel-type info popover on the result
-- card as well as the stats table. GROUP BY fuel over the full history is an
-- 8s+ seq scan otherwise (~17M current rows), so it's precomputed here and
-- refreshed by refreshStats() after each ingest, not queried live.
CREATE MATERIALIZED VIEW registry.stats_by_fuel AS
SELECT
  fuel,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY fuel
WITH NO DATA;
