-- stats_imports: passenger cars currently on the register whose history holds a used-import operation ('import') or, failing
-- that, a sale through a trade organization ('dealer'), per year of that first operation, model and the country the VIN says
-- the car was built in, for the /read/imports article. The origin rule is the oper_name keyword rule of 0011 (ввезен /
-- привезен = import, торг = dealer) plus the operation codes of shared/import-history.ts; new-car and de-registration
-- operations are not used imports. `country` = ISO 3166 alpha-2 from the VIN's WMI ('' = no VIN or an unknown block), worked
-- out in TS (lookupWmi), so the table is rebuilt by scripts/src/imports-stats.ts (db:refresh-imports-stats, part of
-- db:refresh-derived). `n` = cars. Counts are by registration operation, not a verdict on any car.
CREATE TABLE registry.stats_imports (
  origin    text    NOT NULL,
  reg_year  integer NOT NULL,
  country   text    NOT NULL DEFAULT '',
  brand     text    NOT NULL,
  model     text    NOT NULL,
  n         integer NOT NULL,
  PRIMARY KEY (origin, reg_year, country, brand, model)
);
