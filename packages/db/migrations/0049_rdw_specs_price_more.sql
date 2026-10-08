-- RDW specs, stage C3: new list price, body type, colours, cylinders, fuel mix, consumption, EV range, noise, energy label and
-- the open-recall share. Same table, same per-make ingest. Ranges are min / median / max like the earlier measures; `*_n` is
-- how many vehicles have a (plausible) value, so the API can hide a row built from too few. The categorical measures are
-- jsonb arrays of [value, vehicle count] pairs (colours / body types / labels: the top 3; fuel mix: every class), each with
-- the count of vehicles that have the attribute at all. Prices are euros; the Dutch list price includes 21 % VAT and BPM tax
-- (price_ex_tax_eur = price / 1.21 - BPM). ev_kwh100 is kWh per 100 km, noise dB, consumption l/100 km. recall_open_n of
-- recall_n vehicles (those with a known indicator) had an open recall campaign when the register was read.
-- Existing rows stay valid with NULLs until `pnpm ingest:rdw -- --refresh`.

ALTER TABLE registry.rdw_specs
  ADD COLUMN price_eur_min real,
  ADD COLUMN price_eur_median real,
  ADD COLUMN price_eur_max real,
  ADD COLUMN price_ex_tax_eur_min real,
  ADD COLUMN price_ex_tax_eur_median real,
  ADD COLUMN price_ex_tax_eur_max real,
  ADD COLUMN bpm_eur_min real,
  ADD COLUMN bpm_eur_median real,
  ADD COLUMN bpm_eur_max real,
  ADD COLUMN kerb_mass_kg_min real,
  ADD COLUMN kerb_mass_kg_median real,
  ADD COLUMN kerb_mass_kg_max real,
  ADD COLUMN cylinders_min real,
  ADD COLUMN cylinders_median real,
  ADD COLUMN cylinders_max real,
  ADD COLUMN consumption_l100_min real,
  ADD COLUMN consumption_l100_median real,
  ADD COLUMN consumption_l100_max real,
  ADD COLUMN ev_kwh100_min real,
  ADD COLUMN ev_kwh100_median real,
  ADD COLUMN ev_kwh100_max real,
  ADD COLUMN ev_range_km_min real,
  ADD COLUMN ev_range_km_median real,
  ADD COLUMN ev_range_km_max real,
  ADD COLUMN noise_db_min real,
  ADD COLUMN noise_db_median real,
  ADD COLUMN noise_db_max real,
  ADD COLUMN price_eur_n integer,
  ADD COLUMN bpm_eur_n integer,
  ADD COLUMN cylinders_n integer,
  ADD COLUMN consumption_l100_n integer,
  ADD COLUMN ev_kwh100_n integer,
  ADD COLUMN ev_range_km_n integer,
  ADD COLUMN noise_db_n integer,
  ADD COLUMN fuel_mix jsonb,
  ADD COLUMN fuel_mix_n integer,
  ADD COLUMN colours jsonb,
  ADD COLUMN colours_n integer,
  ADD COLUMN body_types jsonb,
  ADD COLUMN body_types_n integer,
  ADD COLUMN energy_labels jsonb,
  ADD COLUMN energy_labels_n integer,
  ADD COLUMN recall_open_n integer,
  ADD COLUMN recall_n integer;
