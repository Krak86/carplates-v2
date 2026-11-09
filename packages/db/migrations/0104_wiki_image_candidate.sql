-- Extra Commons photos per model for the colour-matched hero and the photo strip (scripts/src/wiki-candidates.ts,
-- docs/wiki-recolor-plan.md step 7). One row per (brand, model, Commons file title), keyed like `wiki_image` (lower-cased registry
-- brand / model). `photo_year` = the year read from the file title (NULL = unknown; the API maps a car year to a generation span
-- through `model_generations` at query time). `status`: ok | skip; `skip_reason` (skip only): PAINT_SKIP_REASONS.
-- `bucket` + `lab_*` = the photographed paint colour (same scan as `wiki_image_paint`, but NO mask is stored: candidates are shown
-- unfiltered). `quality` ranks photos of one colour (title score + body area). `algo` = PAINT_ALGO at scan time.
-- `wiki_image_candidate_scan` records that a model was searched (also when nothing qualified), so a rerun resumes.
-- No seed CSV: the scan job regenerates both tables. New tables only: backward-compatible with the previous api colour (blue/green).
CREATE TABLE registry.wiki_image_candidate (
  brand text NOT NULL,
  model text NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  image_width integer NOT NULL,
  image_height integer NOT NULL,
  photo_year smallint,
  attr_author text,
  attr_license text,
  attr_license_url text,
  status text NOT NULL CHECK (status IN ('ok', 'skip')),
  skip_reason text,
  bucket text,
  lab_l real,
  lab_a real,
  lab_b real,
  body_area real,
  quality real NOT NULL DEFAULT 0,
  algo smallint NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand, model, title)
);

CREATE INDEX ix_wiki_image_candidate_pick ON registry.wiki_image_candidate (brand, model, status, bucket);

CREATE TABLE registry.wiki_image_candidate_scan (
  brand text NOT NULL,
  model text NOT NULL,
  found integer NOT NULL,
  algo smallint NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand, model)
);
