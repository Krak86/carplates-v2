-- RDW specs, stage C4 follow-up: the Dutch new list price per fuel class (petrol / diesel / ev / hev / phev / gas), so a model
-- sold in several versions (e-Golf vs Golf) gets a price per version beside the all-versions median. A jsonb array of
-- [fuel class, median price in euros, vehicles with a plausible price] triples; classes with no priced vehicle are omitted.
-- Existing rows stay valid with NULL until `pnpm ingest:rdw -- --refresh`.

ALTER TABLE registry.rdw_specs
  ADD COLUMN price_by_fuel jsonb;
