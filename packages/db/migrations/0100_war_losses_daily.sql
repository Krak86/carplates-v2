-- Russian war losses per day as reported by the General Staff of Ukraine ("approximate" figures), copied from the community
-- API russianwarship.rip so our page survives an upstream outage. `stats` = running totals, `increase` = that day's change,
-- both keyed by category (jsonb: a category added upstream needs no migration).
-- New table only: backward-compatible with the previous api colour (blue/green).
CREATE TABLE registry.war_losses_daily (
  day date PRIMARY KEY,
  day_number integer,
  resource text,
  stats jsonb NOT NULL,
  increase jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
