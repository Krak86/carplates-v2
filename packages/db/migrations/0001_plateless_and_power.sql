-- 2026 layout change: ГСЦ МВС order №67/ОД (2026-06-29) stopped publishing the
-- plate number; the 2026-09-01 resource also added POWER_KWT. Additive only —
-- no new table, so a rollback of the order can re-ingest and patch rows in place.

ALTER TABLE registry.registrations ALTER COLUMN plate DROP NOT NULL;
ALTER TABLE registry.registrations ADD COLUMN power_kwt integer;

-- true when `plate` was reconstructed (event or VIN match) rather than
-- published as-is — see scripts/src/backfill.ts.
ALTER TABLE registry.registrations ADD COLUMN plate_inferred boolean NOT NULL DEFAULT false;

ALTER TABLE registry.registrations
  ADD CONSTRAINT ck_reg_identity CHECK (plate IS NOT NULL OR vin IS NOT NULL);

-- The old dedupe index can no longer key plateless rows (NULL plate would
-- collide with every other NULL-plate row under NULLS NOT DISTINCT). Split it
-- into a plate-keyed half and a vin-keyed half for rows with no plate.
DROP INDEX registry.ux_reg_dedupe;

CREATE UNIQUE INDEX ux_reg_dedupe ON registry.registrations
  (plate, d_reg, oper_code, vin) NULLS NOT DISTINCT WHERE plate IS NOT NULL;

CREATE UNIQUE INDEX ux_reg_dedupe_vin ON registry.registrations
  (vin, d_reg, oper_code) NULLS NOT DISTINCT WHERE plate IS NULL;

-- Rebuild the matview: add power_kwt / plate_inferred (can't ALTER a matview's
-- column set), and exclude plateless rows so DISTINCT ON (plate) never forms a
-- bogus NULL group.
DROP MATERIALIZED VIEW registry.current_registration;

CREATE MATERIALIZED VIEW registry.current_registration AS
SELECT DISTINCT ON (plate)
  plate, person, reg_addr_koatuu, oper_code, oper_name, d_reg, dep_code, dep,
  brand, model, vin, make_year, color, kind, body, purpose, fuel, capacity,
  power_kwt, own_weight, total_weight, plate_inferred
FROM registry.registrations
WHERE plate IS NOT NULL
ORDER BY plate, d_reg DESC NULLS LAST, id DESC
WITH NO DATA;

CREATE UNIQUE INDEX ux_current_registration_plate
  ON registry.current_registration (plate);
