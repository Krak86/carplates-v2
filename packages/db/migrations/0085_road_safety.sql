-- Road-safety (DTP) statistics, see docs/road-safety-plan.md. Sources: Patrol Police yearly / year-to-date XLSX
-- (pre-aggregated, NOT per-crash records) and the Infrastructure Restoration Agency hazardous-section CSVs (data.gov.ua, CC BY).
-- `period` is the last reported month of the file: 12 = full year, 1..9 = year-to-date. A newer YTD file for the same year replaces
-- the older one (the ingest deletes lower periods of that year after loading). `region` holds the canonical name of
-- registry.plate_regions ("Вінницька область", "Київ"), never the raw spelling of a file. Counts are crashes with injured / killed.
-- Re-ingestable from the sources, so not part of the seed CSVs' `registrations` set. New tables only: backward compatible (blue/green).

CREATE TABLE registry.dtp_region_year (
  region             text NOT NULL,
  year               smallint NOT NULL,
  period             smallint NOT NULL,
  crashes            integer NOT NULL,
  deaths             integer NOT NULL,
  injured            integer NOT NULL,
  pedestrian_crashes integer,
  child_crashes      integer,
  PRIMARY KEY (region, year, period)
);

CREATE TABLE registry.dtp_cause_year (
  year    smallint NOT NULL,
  period  smallint NOT NULL,
  cause   text NOT NULL,
  crashes integer NOT NULL,
  deaths  integer NOT NULL,
  injured integer NOT NULL,
  PRIMARY KEY (year, period, cause)
);

CREATE TABLE registry.dtp_type_year (
  year    smallint NOT NULL,
  period  smallint NOT NULL,
  type    text NOT NULL,
  crashes integer NOT NULL,
  deaths  integer NOT NULL,
  injured integer NOT NULL,
  PRIMARY KEY (year, period, type)
);

-- Crashes over `weekday` (1 = Monday .. 7) or `hour` (0..23) (`month` is reserved for the monthly files); deaths / injured
-- are null because these Patrol Police tables count crashes only.
CREATE TABLE registry.dtp_time_year (
  year    smallint NOT NULL,
  period  smallint NOT NULL,
  dim     text NOT NULL CHECK (dim IN ('month', 'weekday', 'hour')),
  bucket  smallint NOT NULL,
  crashes integer NOT NULL,
  deaths  integer,
  injured integer,
  PRIMARY KEY (year, period, dim, bucket)
);

-- State-road table. `road_code` is normalised (trimmed, Cyrillic letters, first token), same as dtp_hazard_section.road_code.
CREATE TABLE registry.dtp_road_year (
  road_code text NOT NULL,
  year      smallint NOT NULL,
  period    smallint NOT NULL,
  road_name text NOT NULL,
  crashes   integer NOT NULL,
  deaths    integer NOT NULL,
  injured   integer NOT NULL,
  PRIMARY KEY (road_code, year, period)
);

-- Hazardous sections (`kind = 'hazard'`) and crash concentration places (`kind = 'concentration'`). `seq` is the row number
-- (`№`) inside the yearly CSV. Coordinates are null when the source value is missing or fails the Ukraine bounding-box check.
CREATE TABLE registry.dtp_hazard_section (
  year         smallint NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('hazard', 'concentration')),
  seq          integer NOT NULL,
  region       text NOT NULL,
  road_code    text NOT NULL,
  road_name    text NOT NULL,
  km_start     integer,
  km_end       integer,
  lat_start    double precision,
  lon_start    double precision,
  lat_end      double precision,
  lon_end      double precision,
  crashes_3y   integer,
  rate         numeric(6, 2),
  hazard_level text,
  PRIMARY KEY (year, kind, seq)
);

CREATE INDEX ix_dtp_hazard_section_region ON registry.dtp_hazard_section (year, region);
CREATE INDEX ix_dtp_hazard_section_road ON registry.dtp_hazard_section (road_code);
