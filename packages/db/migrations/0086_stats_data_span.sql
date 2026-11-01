-- The dates the registry data really covers (/stats "data covers ..." label, /data-status). One row: the first and last registration
-- action date. Dates after today are typos in the source and would stretch the range, so they are ignored. Refreshed by refreshStats().
-- Additive and WITH NO DATA: an old api never reads it, a new api treats the empty view as "unknown".
CREATE MATERIALIZED VIEW registry.stats_data_span AS
SELECT
  min(d_reg) AS first_date,
  max(d_reg) FILTER (WHERE d_reg <= current_date) AS last_date
FROM registry.registrations
WITH NO DATA;
