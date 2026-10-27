-- stats_origin: passenger cars currently on the register by model year, the brand's home country and the country the VIN says
-- the car was assembled in, for the /stats "Where cars come from" panel. Both countries are worked out in TS (brand_origin_period
-- + countryAtYear, wmi_prefix + lookupWmi), so a former state (SU, CSHH, DD, DE-FRG, YU, CSXX) is stored under its own code;
-- '' = unknown (brand not matched, or no standard 17-character VIN). make_year 0 = unknown year. Rebuilt by
-- scripts/src/origin-stats.ts (db:refresh-origin-stats, part of db:refresh-derived). `n` = cars.
CREATE TABLE registry.stats_origin (
  make_year      integer NOT NULL,
  brand_country  text    NOT NULL DEFAULT '',
  plant_country  text    NOT NULL DEFAULT '',
  n              integer NOT NULL,
  PRIMARY KEY (make_year, brand_country, plant_country)
);
