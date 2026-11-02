-- Shareable photo-search links (signed-in users): a private, expiring capability link to one blurred, downscaled photo.
-- The image is an object in the private R2 bucket `carsua-shares` (`object_key`), never in Postgres. Only the SHA-256 of
-- the link token is stored. The API enforces the exact `expires_at` and deletes row + object daily; the bucket lifecycle
-- rule (8 days) is only the backstop. Account deletion cascades the rows (the API removes the objects first).
-- New table only: backward-compatible with the previous api colour during a blue/green deploy.
CREATE TABLE app.shared_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  object_key text NOT NULL,
  plate text NOT NULL,
  -- PlateCandidate[] from the server's own ALPR run; box coordinates are 0-1 fractions.
  candidates jsonb NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  -- Admin takedown: UPDATE app.shared_photos SET revoked_at = now() WHERE id = '…'
  revoked_at timestamptz
);
CREATE UNIQUE INDEX ux_shared_photos_token ON app.shared_photos (token_hash);
CREATE INDEX ix_shared_photos_user ON app.shared_photos (user_id);
CREATE INDEX ix_shared_photos_expires ON app.shared_photos (expires_at);
