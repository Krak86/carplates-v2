-- Shared photos: what was removed from the original ({ facesBlurred, originalSize, storedSize }), shown in the share dialog
-- and in "My shared photos". Nullable: rows from before this migration have none. Backward-compatible with the previous
-- api colour during a blue/green deploy (it never reads or writes the column).
ALTER TABLE app.shared_photos ADD COLUMN removed jsonb;
