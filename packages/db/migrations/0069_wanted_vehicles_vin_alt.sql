-- Some wanted records carry a VIN-shaped number in BOTH the body and the chassis field (a local Y6L…/Y7C… body number and
-- the maker's real KNE…/XTA… VIN). `vin` keeps the first, `vin_alt` the other one, so a lookup by either finds the record.

ALTER TABLE registry.wanted_vehicles ADD COLUMN vin_alt text;

CREATE INDEX ix_wanted_vehicles_vin_alt ON registry.wanted_vehicles (vin_alt) WHERE vin_alt IS NOT NULL;
