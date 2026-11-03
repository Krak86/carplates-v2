-- stats_by_month: registry operations per calendar month (d_reg) and kind, for the /stats trend chart. `op_group`
-- mirrors `operCategory` in apps/web/src/lib/oper-info.ts: 'new' (first registration of a new vehicle), 'import'
-- (used vehicle brought from abroad, IMPORT_OPER_CODES) and 'resale' (change of owner, 307-339 and the single owner
-- codes). Everything else is left out. Whole registry (all vehicle kinds). Rebuilt by `refreshStats` (db:refresh-stats).
CREATE MATERIALIZED VIEW registry.stats_by_month AS
SELECT month, op_group, count(*) AS n
FROM (
  SELECT
    to_char(date_trunc('month', d_reg), 'YYYY-MM') AS month,
    CASE
      WHEN oper_code IN (17, 20, 30, 69, 72, 99, 105) THEN 'new'
      WHEN oper_code IN (70, 71, 100, 172, 221) THEN 'import'
      WHEN oper_code IN (40, 48, 49, 50, 80, 101, 110, 140, 218, 363) OR oper_code BETWEEN 307 AND 339 THEN 'resale'
    END AS op_group
  FROM registry.registrations
  WHERE d_reg IS NOT NULL
) t
WHERE op_group IS NOT NULL
GROUP BY month, op_group
WITH NO DATA;
