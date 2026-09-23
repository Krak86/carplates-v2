-- Registry statistics rollups (Phase 1.5, step A). Precomputed at ingest time
-- so GET /api/stats never runs COUNT(DISTINCT ...) over the full history on a
-- request path — see PLAN.md, "Registry statistics".

-- Mirrors packages/shared/src/regions.ts REGIONS: a static historical
-- prefix->oblast assignment that predates this app and isn't expected to
-- change. Keep the two in sync if it ever does. Needed here (rather than
-- mapping prefix->region in the API layer after aggregation) so
-- COUNT(DISTINCT ...) is computed once per real region, not summed across
-- that region's two prefixes — a vehicle re-plated between them would
-- otherwise be double-counted.
CREATE TABLE registry.plate_regions (
  prefix text PRIMARY KEY,
  region text NOT NULL
);

INSERT INTO registry.plate_regions (prefix, region) VALUES
  ('АА', 'Київ'), ('КА', 'Київ'),
  ('АІ', 'Київська область'), ('КІ', 'Київська область'),
  ('АВ', 'Вінницька область'), ('КВ', 'Вінницька область'),
  ('АС', 'Волинська область'), ('КС', 'Волинська область'),
  ('АЕ', 'Дніпропетровська область'), ('КЕ', 'Дніпропетровська область'),
  ('АК', 'АР Крим'), ('КК', 'АР Крим'),
  ('АН', 'Донецька область'), ('КН', 'Донецька область'),
  ('АМ', 'Житомирська область'), ('КМ', 'Житомирська область'),
  ('АО', 'Закарпатська область'), ('КО', 'Закарпатська область'),
  ('АР', 'Запорізька область'), ('КР', 'Запорізька область'),
  ('АТ', 'Івано-Франківська область'), ('КТ', 'Івано-Франківська область'),
  ('ВА', 'Кіровоградська область'), ('НА', 'Кіровоградська область'),
  ('ВВ', 'Луганська область'), ('НВ', 'Луганська область'),
  ('ВС', 'Львівська область'), ('НС', 'Львівська область'),
  ('ВЕ', 'Миколаївська область'), ('НЕ', 'Миколаївська область'),
  ('ВН', 'Одеська область'), ('НН', 'Одеська область'),
  ('ВІ', 'Полтавська область'), ('НІ', 'Полтавська область'),
  ('ВК', 'Рівненська область'), ('НК', 'Рівненська область'),
  ('СН', 'Севастополь'), ('ІН', 'Севастополь'),
  ('ВМ', 'Сумська область'), ('НМ', 'Сумська область'),
  ('ВО', 'Тернопільська область'), ('НО', 'Тернопільська область'),
  ('АХ', 'Харківська область'), ('КХ', 'Харківська область'),
  ('ВТ', 'Херсонська область'), ('НТ', 'Херсонська область'),
  ('ВХ', 'Хмельницька область'), ('НХ', 'Хмельницька область'),
  ('СА', 'Черкаська область'), ('ІА', 'Черкаська область'),
  ('СВ', 'Чернігівська область'), ('ІВ', 'Чернігівська область'),
  ('СЕ', 'Чернівецька область'), ('ІЕ', 'Чернівецька область');

-- Single-row totals.
CREATE MATERIALIZED VIEW registry.stats_summary AS
SELECT
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins,
  count(*) FILTER (WHERE plate IS NULL) AS plateless_count
FROM registry.registrations
WITH NO DATA;

-- By registration-action year (`d_reg`); a NULL bucket covers rows with no
-- recorded date.
CREATE MATERIALIZED VIEW registry.stats_by_year AS
SELECT
  extract(year FROM d_reg)::int AS year,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY extract(year FROM d_reg)::int
WITH NO DATA;

-- Plateless rows have no prefix and are excluded (already covered by
-- stats_summary.plateless_count).
CREATE MATERIALIZED VIEW registry.stats_by_region AS
SELECT
  pr.region,
  count(*) AS total_rows,
  count(DISTINCT r.plate) AS distinct_plates,
  count(DISTINCT r.vin) AS distinct_vins
FROM registry.registrations r
JOIN registry.plate_regions pr ON pr.prefix = left(r.plate, 2)
WHERE r.plate IS NOT NULL
GROUP BY pr.region
WITH NO DATA;

-- The one 2D rollup, for a future map + year-range filter combination.
-- Deliberately not a full region x year x body x color x kind cube (would be
-- 700k+ mostly-empty rows) -- add another 2D slice only when a concrete UI
-- need shows up, not preemptively.
CREATE MATERIALIZED VIEW registry.stats_by_region_year AS
SELECT
  pr.region,
  extract(year FROM r.d_reg)::int AS year,
  count(*) AS total_rows,
  count(DISTINCT r.plate) AS distinct_plates,
  count(DISTINCT r.vin) AS distinct_vins
FROM registry.registrations r
JOIN registry.plate_regions pr ON pr.prefix = left(r.plate, 2)
WHERE r.plate IS NOT NULL
GROUP BY pr.region, extract(year FROM r.d_reg)::int
WITH NO DATA;

CREATE MATERIALIZED VIEW registry.stats_by_body AS
SELECT
  body,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY body
WITH NO DATA;

CREATE MATERIALIZED VIEW registry.stats_by_kind AS
SELECT
  kind,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY kind
WITH NO DATA;

CREATE MATERIALIZED VIEW registry.stats_by_color AS
SELECT
  color,
  count(*) AS total_rows,
  count(DISTINCT plate) AS distinct_plates,
  count(DISTINCT vin) AS distinct_vins
FROM registry.registrations
GROUP BY color
WITH NO DATA;
