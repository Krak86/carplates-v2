-- stats_by_month grows a cars-vs-other split: `is_car` is true for the passenger kind 'ЛЕГКОВИЙ' (19.6M of 24.7M rows; the
-- other twelve kinds - trucks, motorcycles, trailers, buses ... - are false), so the /stats trend can be compared with RST's
-- passenger-car figures. A materialized view cannot gain a column, so it is rebuilt. Blue/green safe: month, op_group and n keep
-- their names and meaning, and the previous release sums the extra (is_car) rows per group, so it keeps working; the view is
-- rebuilt WITH DATA (about 12 s) so it is never empty for the previous release. Rebuilt later by `refreshStats` (db:refresh-stats).
DROP MATERIALIZED VIEW registry.stats_by_month;

CREATE MATERIALIZED VIEW registry.stats_by_month AS
SELECT month, op_group, is_car, count(*) AS n
FROM (
  SELECT
    to_char(date_trunc('month', d_reg), 'YYYY-MM') AS month,
    CASE
      WHEN oper_code IN (17, 20, 30, 69, 72, 99, 105) THEN 'new'
      WHEN oper_code IN (70, 71, 100, 172, 221) THEN 'import'
      WHEN oper_code IN (40, 48, 49, 50, 80, 101, 110, 140, 218, 363) OR oper_code BETWEEN 307 AND 339 THEN 'resale'
    END AS op_group,
    kind = 'ЛЕГКОВИЙ' AS is_car
  FROM registry.registrations
  WHERE d_reg IS NOT NULL
) t
WHERE op_group IS NOT NULL
GROUP BY month, op_group, is_car;
