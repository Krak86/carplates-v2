-- Per-model-year breakdown of a catalog model (fuel, body, colour, regions for each make year), the input of the generation stats on
-- /cars/:make/:model. Rebuilt with the other catalog_* tables by scripts/src/catalog-build.ts (db:refresh-catalog). Read on demand
-- (not kept in API memory): `by_year` is CatalogYearStats, about 10 KB per model.
CREATE TABLE registry.catalog_year_stats (
  make_slug  text  NOT NULL,
  model_slug text  NOT NULL,
  by_year    jsonb NOT NULL,
  PRIMARY KEY (make_slug, model_slug)
);
