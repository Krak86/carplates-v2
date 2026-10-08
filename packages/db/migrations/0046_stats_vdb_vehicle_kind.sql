-- stats_vdb grows beyond passenger cars: one rollup per vehicle class (car / motorcycle / truck / bus, the classes
-- `vdbVehicleClass` in @carplates/shared maps the registry's `kind` text to). Existing rows were passenger cars only.
-- Rebuilt by scripts/src/vdb-stats.ts (`pnpm db:refresh-vdb-stats`); the unmatched bucket (vdb_id NULL) is per class.

ALTER TABLE registry.stats_vdb ADD COLUMN vehicle_kind text NOT NULL DEFAULT 'car';

CREATE INDEX ix_stats_vdb_kind ON registry.stats_vdb (vehicle_kind);
