-- Live air-raid alerts recorded by the API poller (Ukraine Alarm feed), one row per area alert.
-- An alert is open while ended_at IS NULL; the poller closes it when the area leaves the feed.
-- New table only: backward-compatible with the previous api colour (blue/green).
CREATE TABLE registry.alarm_events (
  id bigserial PRIMARY KEY,
  -- Upstream regionId of the state / district / community.
  area_id text NOT NULL,
  area_name text NOT NULL,
  -- Plate-region name (`REGIONS` value) of the oblast the area belongs to.
  region text NOT NULL,
  -- Upstream granularity: State | District | Community.
  kind text NOT NULL,
  level text,
  types text[] NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);
CREATE INDEX ix_alarm_events_started ON registry.alarm_events (started_at);
-- One open alert per area, so two api instances (blue/green) polling the same feed never double-insert.
CREATE UNIQUE INDEX ux_alarm_events_open ON registry.alarm_events (area_id) WHERE ended_at IS NULL;
