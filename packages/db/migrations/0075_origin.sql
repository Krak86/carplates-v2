-- Vehicle origin ("Where it comes from", ORIGIN_PLAN.md). New tables only, so a blue/green api keeps working.
-- Filled by scripts/src/ingest-brand-origin.ts (Wikidata, NHTSA WMI list) and, for model_plant, a hand-curated CSV (release 2).
--
-- `brand_slug` is `brandSlug()` from @carplates/shared (the logo / Euro NCAP slug). `country_code` is ISO 3166-1 alpha-2 for a
-- current country; periods store the *modern* code and `countryAtYear` (packages/shared/src/origin.ts) maps it to the legacy state in
-- force that year (SU, CSHH, DD, YU, CSXX, DE-FRG). A row that must be a legacy state outright (ZAZ, LuAZ = SU) stores that code.
-- `from_year` 0 = since the beginning, `to_year` NULL = still true. Missing rows mean "unknown", never "no change".

CREATE TABLE registry.brand_origin_period (
  brand_slug text NOT NULL,
  from_year smallint NOT NULL DEFAULT 0,
  to_year smallint,
  country_code text NOT NULL,
  founded_year smallint,
  hq_city text,
  source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_slug, from_year)
);

CREATE TABLE registry.brand_ownership (
  brand_slug text NOT NULL,
  owner_name text NOT NULL,
  owner_country text,
  from_year smallint NOT NULL DEFAULT 0,
  to_year smallint,
  source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_slug, owner_name, from_year)
);

-- Created now, filled in release 2 (hand-curated from Wikipedia, one source_url per row).
CREATE TABLE registry.model_plant (
  brand_slug text NOT NULL,
  model_slug text NOT NULL,
  country_code text NOT NULL,
  city text NOT NULL DEFAULT '',
  from_year smallint NOT NULL DEFAULT 0,
  to_year smallint,
  source_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_slug, model_slug, country_code, city, from_year)
);

CREATE TABLE registry.wmi_prefix (
  wmi text NOT NULL,
  from_year smallint NOT NULL DEFAULT 0,
  to_year smallint,
  maker text,
  country_code text,
  region text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wmi, from_year)
);
