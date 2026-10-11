-- Car generations (stage I): which generation of a model a car belongs to (code, label, production years), from Wikidata
-- (CC0: generation items, order) and Wikipedia (CC BY-SA: infobox years / body styles / platform, section headings) — facts only,
-- credited on About. The key is the Wikipedia series (make + model name) run through makeKey / modelKey, matched with the
-- VehiclesDB matcher. Filled by `pnpm ingest:generations`; the table is replaced as a whole.

CREATE TABLE registry.model_generations (
  make_key     text     NOT NULL,
  model_key    text     NOT NULL,
  make         text     NOT NULL,
  model        text     NOT NULL,
  year_from    smallint NOT NULL,
  year_to      smallint,           -- NULL = still in production
  code         text     NOT NULL DEFAULT '',
  label        text     NOT NULL,
  body_styles  text     NOT NULL DEFAULT '',
  platform     text     NOT NULL DEFAULT '',
  wiki_title   text     NOT NULL DEFAULT '',
  wikidata_id  text     NOT NULL DEFAULT '',
  source       text     NOT NULL,  -- wikidata | prefix | headings | manual
  PRIMARY KEY (make_key, model_key, year_from)
);
