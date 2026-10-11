-- Wikipedia spec catalogue (stage K): per generation of `model_generations` (same key), the dimensions / mass / tank, the drive
-- layout + transmission and the engine list (with power) that the generation's Wikipedia articles state (CC BY-SA, facts only,
-- credited on About). Values are catalogue figures for the generation, not for one car. Each block comes from one edition
-- (en -> ru -> uk -> de -> home market of the make): `src_*` = dimensions, `engines_*`, `drive_*`. Dimension columns are NULL
-- where RDW has a row for the make/model (measured, per model-year: never show both). Filled by `pnpm ingest:wikispecs`.

CREATE TABLE registry.model_spec_wiki (
  make_key       text     NOT NULL,
  model_key      text     NOT NULL,
  year_from      smallint NOT NULL,
  wheelbase_mm   integer,
  length_mm      integer,
  width_mm       integer,
  height_mm      integer,
  kerb_kg        integer,
  fuel_tank_l    real,
  layout         text     NOT NULL DEFAULT '',
  transmission   text     NOT NULL DEFAULT '',
  engines        jsonb    NOT NULL DEFAULT '[]',
  src_lang       text     NOT NULL DEFAULT '',  -- edition of the dimensions ('' = none)
  src_title      text     NOT NULL DEFAULT '',
  revid          bigint,                         -- revision the dimensions were read from
  engines_lang   text     NOT NULL DEFAULT '',
  engines_title  text     NOT NULL DEFAULT '',
  drive_lang     text     NOT NULL DEFAULT '',
  drive_title    text     NOT NULL DEFAULT '',
  wikidata_id    text     NOT NULL DEFAULT '',
  PRIMARY KEY (make_key, model_key, year_from)
);
