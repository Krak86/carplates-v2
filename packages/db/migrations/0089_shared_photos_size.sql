-- Shared photos: pixel size of the stored copy, so the link preview can send og:image:width/height (messengers size the
-- card from them before fetching the image). Nullable: rows from before this migration have none and send no tags.
-- Backward-compatible with the previous api colour during a blue/green deploy (it never reads or writes the columns).
ALTER TABLE app.shared_photos ADD COLUMN width integer CHECK (width > 0);
ALTER TABLE app.shared_photos ADD COLUMN height integer CHECK (height > 0);
