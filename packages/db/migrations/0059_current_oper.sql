-- Advanced search "registration status" filter: the LAST operation on each vehicle (current_registration.oper_code,
-- e.g. 215 = ТИМЧАСОВИЙ ДЕРЖАВНИЙ ОБЛІК ТЗ ЗА ВІЙСЬКОВОСЛУЖБОВЦЕМ). Equality on the code, so a plain btree serves it.
CREATE INDEX IF NOT EXISTS ix_current_reg_oper_code ON registry.current_registration (oper_code);

-- Current-status rollup (counts vehicles by their latest operation, not every historical row like the other
-- stats_by_*). Grouped by code, with the most common name as the label: the free-text name has dozens of spelling
-- variants per code. Refreshed by refreshStats() (pnpm db:refresh-stats).
CREATE MATERIALIZED VIEW registry.stats_by_oper AS
SELECT
  oper_code,
  mode() WITHIN GROUP (ORDER BY oper_name) AS oper_name,
  count(*) AS distinct_plates
FROM registry.current_registration
WHERE oper_code IS NOT NULL
GROUP BY oper_code
WITH NO DATA;
