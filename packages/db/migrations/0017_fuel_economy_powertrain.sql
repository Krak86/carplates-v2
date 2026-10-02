-- Powertrain of each fuel_economy row: 'ice' | 'hybrid' | 'phev' | 'ev' | 'fcev'. The registry only says
-- "ЕЛЕКТРО АБО БЕНЗИН" for hybrids, so matching needs this to avoid averaging a hybrid Camry with a petrol one.
ALTER TABLE registry.fuel_economy ADD COLUMN powertrain text NOT NULL DEFAULT 'ice';
