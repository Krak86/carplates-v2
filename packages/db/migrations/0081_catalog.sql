-- Model catalog (/cars/:make/:model). Rebuilt by scripts/src/catalog-build.ts (db:refresh-catalog, part of db:refresh-derived):
-- the taxonomy lives in TS (@carplates/shared catalogSlugs), so these are plain tables, not matviews. Passenger cars only.
--   catalog_alias  raw registry (brand, model) -> make/model slug and the rule that decided it
--   catalog_model  one row per model with at least CATALOG_KEEP_MIN_CARS current cars; `stats` is the rollup (CatalogStats)
--   catalog_make   one row per make with its model count
CREATE TABLE registry.catalog_alias (
  brand      text NOT NULL,
  model      text NOT NULL,
  make_slug  text NOT NULL,
  model_slug text NOT NULL,
  how        text NOT NULL,
  PRIMARY KEY (brand, model)
);
CREATE INDEX ix_catalog_alias_slugs ON registry.catalog_alias (make_slug, model_slug);

CREATE TABLE registry.catalog_model (
  make_slug     text     NOT NULL,
  model_slug    text     NOT NULL,
  make_name     text     NOT NULL,
  model_name    text     NOT NULL,
  n             integer  NOT NULL,
  year_min      smallint,
  year_max      smallint,
  top_raw_brand text     NOT NULL,
  top_raw_model text     NOT NULL,
  kind_group    text     NOT NULL,
  rank          integer  NOT NULL,
  indexable     boolean  NOT NULL,
  stats         jsonb    NOT NULL,
  PRIMARY KEY (make_slug, model_slug)
);

CREATE TABLE registry.catalog_make (
  make_slug text    NOT NULL PRIMARY KEY,
  make_name text    NOT NULL,
  n         integer NOT NULL,
  models    integer NOT NULL
);
