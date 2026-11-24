-- Cross-device sync of the saved comparisons on /compare (signed-in users). One row per (user, id) where `id` is `<a>|<b>`
-- in the URL form of the refs. `date` is the last-write time in ms (client clock, clamped by the API) - the newer write wins
-- a conflict. `deleted` rows are tombstones so a removal reaches devices that were offline; the API purges them after 30 days.
CREATE TABLE app.user_saved_comparisons (
  user_id uuid NOT NULL,
  id text NOT NULL,
  a text NOT NULL,
  b text NOT NULL,
  label_a text NOT NULL,
  label_b text NOT NULL,
  date bigint NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_user_saved_comparisons_user_id FOREIGN KEY (user_id) REFERENCES app.users (id) ON DELETE CASCADE
);
CREATE INDEX ix_user_saved_comparisons_live ON app.user_saved_comparisons (user_id, date DESC) WHERE NOT deleted;
