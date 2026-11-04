-- Air-raid alert history rolled up per oblast, source and UTC start day, from the MIT-licensed siren dataset
-- (Vadimkin/ukrainian-air-raid-sirens-dataset). Overlapping raion rows are merged into continuous periods before counting.
-- Loaded by scripts/src/ingest-alarm-history.ts (seed CSV alarm-history.csv.gz).
-- New table only: backward-compatible with the previous api colour.
CREATE TABLE registry.alarm_history_daily (
  -- Plate-region name (`REGIONS` value, e.g. 'Харківська область', 'Київ').
  region text NOT NULL,
  -- 'official' | 'volunteer' (never mixed: the volunteer file has estimated end times).
  source text NOT NULL,
  day date NOT NULL,
  alerts integer NOT NULL,
  seconds integer NOT NULL,
  longest_seconds integer NOT NULL,
  -- Alerts whose end time is an estimate (volunteer `naive`).
  estimated_alerts integer NOT NULL DEFAULT 0,
  PRIMARY KEY (region, source, day)
);
CREATE INDEX ix_alarm_history_daily_day ON registry.alarm_history_daily (day);
