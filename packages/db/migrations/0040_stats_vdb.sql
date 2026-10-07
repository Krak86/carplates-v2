-- Registry passenger cars rolled up per matched VehiclesDB model — backs the "markets" panel on /stats. Rebuilt by
-- scripts/src/vdb-stats.ts (matching is TypeScript, `matchVdbModel` in @carplates/shared, not SQL).
-- One row per catalog model with at least one registered car; vdb_id NULL is the single bucket of cars whose
-- make/model has no catalog match, so coverage can be shown. Separate, removable block with vdb_models.

CREATE TABLE registry.stats_vdb (
  vdb_id text,
  make_name text,
  model_name text,
  -- Catalog decile (1 = most popular across markets); null when the model is unranked or unmatched.
  global_decile smallint,
  countries text[] NOT NULL DEFAULT '{}',
  ua_only boolean NOT NULL DEFAULT false,
  n integer NOT NULL
);

CREATE INDEX ix_stats_vdb_decile ON registry.stats_vdb (global_decile);
