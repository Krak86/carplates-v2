-- search.service.ts matches fuel by case-insensitive substring too (ILIKE '%keyword%', see
-- vehicleFuel.ts's fuelKeyword -- a hybrid combo like "ЕЛЕКТРО АБО БЕНЗИН" must match every fuel
-- it contains), same shape as the brand/model substring match that 0013 already covers. The 0012
-- btree index on fuel only accelerates an exact/prefix match, not an infix ILIKE -- add the same
-- pg_trgm GIN index brand/model already got.
CREATE INDEX ix_current_reg_fuel_trgm ON registry.current_registration USING gin (fuel gin_trgm_ops);
