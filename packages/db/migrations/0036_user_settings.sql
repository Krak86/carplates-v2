-- Per-user preferences (default background layer, background presets, ...) as one JSON document per user.
-- `updated_at` is the last-edit time in ms (client clock, clamped by the API) — the newer document wins a conflict.
CREATE TABLE app.user_settings (
  user_id uuid PRIMARY KEY REFERENCES app.users (id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at bigint NOT NULL
);
