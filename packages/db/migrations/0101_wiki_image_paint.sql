-- Paint scan of the Wikimedia hero photos for the colour filter (scripts/src/wiki-paint.ts, docs/wiki-recolor-plan.md).
-- One row per photo file (`image_url`; several wiki_image rows can share one file). Skip rows are stored too, so a photo
-- is scanned once per `algo`: a better algorithm bumps PAINT_ALGO (wiki-paint-core.ts) and only rows with a lower `algo` rescan.
-- `status`: ok | skip. `skip_reason` (skip only): PAINT_SKIP_REASONS. `bucket` + `lab_*` = the photographed paint colour.
-- `mask` = one RGBA webp at mask_w x mask_h (RGB = body shading, A = paint weight), served by the API and recoloured client-side.
-- No seed CSV (binary): the scan job regenerates the table after deploy.
-- New table only: backward-compatible with the previous api colour (blue/green).
CREATE TABLE registry.wiki_image_paint (
  image_url text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('ok', 'skip')),
  skip_reason text,
  bucket text,
  lab_l real,
  lab_a real,
  lab_b real,
  body_area real,
  mask_w smallint,
  mask_h smallint,
  mask bytea,
  algo smallint NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

-- The API serves a mask at /api/wiki/paint/<md5(image_url)>.webp: look it up without a scan of the table.
CREATE UNIQUE INDEX ux_wiki_image_paint_md5 ON registry.wiki_image_paint (md5(image_url));
