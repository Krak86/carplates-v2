-- Hand-curated spec rows (stage K-M7 step 5): for models no Wikipedia article covers (Chinese / Indian bikes, Ukrainian buses)
-- a row can carry ONE citation of a manufacturer page instead of a Wikipedia edition. Such a row has `src_lang` /
-- `engines_lang` / `drive_lang` = 'curated' (for the blocks that hold data) and these three columns; the UI shows "source: <label>",
-- never Wikipedia. '' = a Wikipedia row. Filled by `pnpm ingest:wikispecs:curated` from scripts/src/wikispecs-curated.csv.

ALTER TABLE registry.model_spec_wiki
  ADD COLUMN source_label    text NOT NULL DEFAULT '',  -- display name of the cited site, e.g. 'Bajaj Auto'
  ADD COLUMN source_url      text NOT NULL DEFAULT '',  -- the cited manufacturer page
  ADD COLUMN source_accessed text NOT NULL DEFAULT '';  -- ISO date the page was read
