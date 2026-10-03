-- infocar's generation id for a video (the `_id7347` in the video page's canonical URL, the same id as the catalog's
-- `test_rav4_id7347.html` version page), so a video can be limited to the generation (year range) of the car being viewed.
-- NULL = the video isn't tagged with a generation. Filled by re-running `pnpm ingest:infocar:videos` (cached pages) or
-- the committed CSV.

ALTER TABLE registry.car_videos ADD COLUMN generation_id integer;
