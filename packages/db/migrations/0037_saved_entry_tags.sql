-- Favorite labels: the ids (app.user_settings.data -> labels[].id) put on a favorite. Synced per entry with the rest of
-- the row, so the newer write wins; NULL = no labels.
ALTER TABLE app.user_saved_entries ADD COLUMN tags text[];
