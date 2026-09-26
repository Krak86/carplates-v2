-- Vehicle-origin rollup: imported from abroad vs. bought domestically through a dealer/trade
-- organization, derived from oper_name free text (see PLAN.md's research note on this).
--
-- oper_code is NOT a stable key here -- the same code is reused across years for unrelated
-- operations (see scripts/src/transform.ts's header-driven mapping rationale) -- so this
-- matches on oper_name keywords instead:
--   - 'ввезен'/'привезен' (ВВЕЗЕНО/ВВЕЗЕНІ/ПРИВЕЗЕНОГО, "brought IN") is the import signal.
--     Deliberately NOT a bare '%кордон%' ("abroad/border") match -- that also catches
--     "issued for a trip abroad" and "deregistered on export abroad" rows (~400k rows), which
--     mean the opposite of importing a car. 'вивезен'/'поїздк' (export/travel) never contain
--     the 'ввезен'/'привезен' substrings, so this stays import-only.
--   - 'торг' (ТОРГОВЕЛЬНІЙ/ТОРГІВЕЛЬНІЙ ОРГАНІЗАЦІЇ, "trade organization") is the dealer signal.
-- A resale/reregistration event (the majority of rows) has neither keyword and lands in NULL
-- ("unknown") -- correct, since it says nothing about where the car originally came from.
CREATE MATERIALIZED VIEW registry.stats_by_origin AS
SELECT
  CASE
    WHEN (oper_name ILIKE '%ввезен%' OR oper_name ILIKE '%привезен%') AND oper_name ILIKE '%торг%'
      THEN 'Ввезено з-за кордону, дилер'
    WHEN oper_name ILIKE '%ввезен%' OR oper_name ILIKE '%привезен%'
      THEN 'Ввезено з-за кордону, приватно'
    WHEN oper_name ILIKE '%торг%'
      THEN 'Придбано в Україні, дилер'
    ELSE NULL
  END AS origin,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY 1
WITH NO DATA;
