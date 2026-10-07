-- Cross-device sync of the favorites + history lists (signed-in users). One row per (user, list, kind, value);
-- `date` is the entry's last-write time in ms (client clock, clamped by the API) — the newer write wins a conflict.
-- `deleted` rows are tombstones so a deletion reaches devices that were offline; the API purges them after 30 days.
CREATE TABLE app.user_saved_entries (
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  list text NOT NULL CHECK (list IN ('favorite', 'history')),
  kind text NOT NULL CHECK (kind IN ('plate', 'vin')),
  value text NOT NULL,
  label text,
  found boolean,
  date bigint NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, list, kind, value)
);
CREATE INDEX ix_user_saved_entries_live ON app.user_saved_entries (user_id, list, date DESC) WHERE NOT deleted;
