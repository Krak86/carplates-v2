-- Prozorro.Sale: `is_car` = the auction is about vehicles only. A property sale (a bankruptcy estate, a factory) that lists one
-- vehicle among other assets carried a plate found in its description and was stored like a car lot. The parser now sets the flag
-- (scripts/src/prozorro-parse.ts: no non-vehicle item, and no property-sale title without a make); the `/auctions` list and stats
-- show only `is_car` lots by default. Existing rows default to true until `pnpm ingest:prozorro --from 2017-01-01` recomputes them
-- (the upsert also replaces a row whose flag changed). Additive column, backward compatible with the previous api.
ALTER TABLE registry.prozorro_auctions ADD COLUMN is_car boolean NOT NULL DEFAULT true;
