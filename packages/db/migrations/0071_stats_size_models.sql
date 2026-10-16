-- stats_size_models: one row per Ukrainian passenger model (brand/model as grouped by weight-stats) with its dominant
-- registry body, RDW's most common body type for the model (`rdw_body`, the raw Dutch key — registry bodies call a RAV4 a
-- wagon) and catalogue dimensions in mm (RDW year-medians, Wikipedia where RDW has none). Backs the /read/body-types
-- and /read/sizes explainers and the size explorer. `n` = current registrations. Dimensions are nullable: a model may match
-- no reference row. Rebuilt by scripts/src/spec-stats.ts (db:refresh-spec-stats, part of db:refresh-derived).
CREATE TABLE registry.stats_size_models (
  brand        text    NOT NULL,
  model        text    NOT NULL,
  n            integer NOT NULL,
  body         text,
  rdw_body     text,
  length_mm   integer,
  width_mm     integer,
  height_mm    integer,
  wheelbase_mm integer,
  source       text,
  PRIMARY KEY (brand, model)
);
