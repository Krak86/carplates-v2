-- Advanced search region filter (apps/api/src/search) matches a plate's first 2 chars against
-- the prefixes for a chosen region (packages/shared/src/regions.ts's REGIONS, ~50 distinct
-- values over 15M+ rows) -- a small expression index on that prefix keeps it exactly as cheap as
-- the other 0012 filters (BitmapAnd over independent single-column indexes), no composite-index
-- rework needed.
CREATE INDEX ix_current_reg_plate_region ON registry.current_registration (left(plate, 2));
