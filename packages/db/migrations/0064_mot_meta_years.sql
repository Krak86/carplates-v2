-- mot_meta.years: the DVSA test years pooled in the mot_* counts (not always a contiguous range once years are merged one
-- by one with `ingest:mot -- --merge`). The merge refuses a year that is already listed, so a year can never be counted twice.
ALTER TABLE registry.mot_meta ADD COLUMN years smallint[];
UPDATE registry.mot_meta SET years = ARRAY(SELECT generate_series(year_from::int, year_to::int)::smallint);
