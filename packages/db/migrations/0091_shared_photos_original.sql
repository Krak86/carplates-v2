-- Shared photos: key of the private, short-lived unblurred upload kept while the share dialog is open so the manual blur
-- editor can restore or re-blur from it. Cleared (and the object deleted) on confirm, cancel, delete, expiry and by an
-- hourly sweep. Nullable; backward-compatible with the previous api colour during a blue/green deploy (never read or written).
ALTER TABLE app.shared_photos ADD COLUMN original_key text;
CREATE INDEX ix_shared_photos_original ON app.shared_photos (created_at) WHERE original_key IS NOT NULL;
